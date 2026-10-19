// 移植自 pi-powerline-footer 的 Editor Stash（https://github.com/nicobailon/pi-powerline-footer）

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
	type ExtensionAPI,
	type ExtensionContext,
	getAgentDir,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

const STASH_HISTORY_LIMIT = 12;
const STASH_PREVIEW_WIDTH = 72;
const STATUS_KEY = "stash";

// ── 状态（module 级）：active stash 是 session-local；history 落盘 ──
let stashedEditorText: string | null = null;
let stashHistory: string[] = readPersistedStashHistory();

function getStashHistoryFile(): string {
	// pi 侧 getAgentDir() → ~/.pi/agent；omp 侧重映射到 @oh-my-pi/pi-utils 的
	// getAgentDir() → ~/.omp/agent（profile 感知）。各 harness 各存各的，互不共享。
	return join(getAgentDir(), "editor-stash", "stash-history.json");
}

function hasNonWhitespaceText(text: string): boolean {
	return text.trim().length > 0;
}

function buildStashPreview(text: string, maxWidth: number): string {
	const compact = text.replace(/\s+/g, " ").trim();
	if (!compact) return "(empty)";
	return truncateToWidth(compact, maxWidth, "…");
}

function normalizeStashHistoryEntries(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const history: string[] = [];
	for (const entry of value) {
		if (typeof entry !== "string") {
			continue;
		}

		if (!hasNonWhitespaceText(entry)) {
			continue;
		}

		if (history[history.length - 1] === entry) {
			continue;
		}

		history.push(entry);
		if (history.length >= STASH_HISTORY_LIMIT) {
			break;
		}
	}

	return history;
}

function readPersistedStashHistory(): string[] {
	const stashHistoryPath = getStashHistoryFile();

	try {
		if (!existsSync(stashHistoryPath)) {
			return [];
		}

		const parsed: unknown = JSON.parse(readFileSync(stashHistoryPath, "utf-8"));
		const history =
			typeof parsed === "object" && parsed !== null && "history" in parsed
				? parsed.history
				: undefined;
		return normalizeStashHistoryEntries(history);
	} catch (error) {
		console.debug(
			`[editor-stash] Failed to read stash history from ${stashHistoryPath}:`,
			error,
		);
		return [];
	}
}

function persistStashHistory(history: string[]): void {
	const stashHistoryPath = getStashHistoryFile();
	const payload = {
		version: 1,
		history: history.slice(0, STASH_HISTORY_LIMIT),
	};

	try {
		mkdirSync(dirname(stashHistoryPath), { recursive: true });
		writeFileSync(stashHistoryPath, `${JSON.stringify(payload, null, 2)}\n`);
	} catch (error) {
		console.debug(
			`[editor-stash] Failed to persist stash history to ${stashHistoryPath}:`,
			error,
		);
	}
}

function pushStashHistory(history: string[], text: string): boolean {
	if (!hasNonWhitespaceText(text)) return false;
	if (history[0] === text) return false;

	history.unshift(text);
	if (history.length > STASH_HISTORY_LIMIT) {
		history.length = STASH_HISTORY_LIMIT;
	}

	return true;
}

function addStashHistoryEntry(text: string): void {
	const changed = pushStashHistory(stashHistory, text);
	if (!changed) {
		return;
	}

	persistStashHistory(stashHistory);
}

// ── 核心交互（omp 与 pi 的 API 形状一致，消息文案与 pi-powerline 逐字一致）──

function stashOrRestore(ctx: ExtensionContext): void {
	const rawText = ctx.ui.getEditorText();

	if (!hasNonWhitespaceText(rawText)) {
		if (stashedEditorText === null) {
			ctx.ui.notify("Nothing to stash", "info");
			return;
		}

		ctx.ui.setEditorText(stashedEditorText);
		stashedEditorText = null;
		ctx.ui.setStatus(STATUS_KEY, undefined);
		ctx.ui.notify("Stash restored", "info");
		return;
	}

	const hasStash = stashedEditorText !== null;
	stashedEditorText = rawText;
	addStashHistoryEntry(rawText);
	ctx.ui.setEditorText("");
	ctx.ui.setStatus(STATUS_KEY, "stash");
	ctx.ui.notify(hasStash ? "Stash updated" : "Text stashed", "info");
}

async function openStashHistory(ctx: ExtensionContext): Promise<void> {
	if (stashHistory.length === 0) {
		ctx.ui.notify("No stashed prompts yet", "info");
		return;
	}

	const labels = stashHistory.map(
		(entry, i) => `#${i + 1} ${buildStashPreview(entry, STASH_PREVIEW_WIDTH)}`,
	);
	const selected = await ctx.ui.select("Stash history", labels);
	if (!selected) return;

	const i = Number.parseInt(selected.slice(1), 10); // label 形如 "#3 <preview>"
	const entry = Number.isNaN(i) ? undefined : stashHistory[i - 1];
	if (entry === undefined) return;

	const action = await ctx.ui.select("Stashed prompt", ["Insert", "Cancel"]);
	if (action === "Insert") await insertSelectedPromptHistoryEntry(ctx, entry);
}

async function insertSelectedPromptHistoryEntry(
	ctx: ExtensionContext,
	selected: string,
): Promise<void> {
	const currentText = ctx.ui.getEditorText();
	if (!hasNonWhitespaceText(currentText)) {
		ctx.ui.setEditorText(selected);
		ctx.ui.notify("Inserted prompt", "info");
		return;
	}

	const action = await ctx.ui.select("Insert prompt", [
		"Replace",
		"Append",
		"Cancel",
	]);

	if (action === "Replace") {
		ctx.ui.setEditorText(selected);
		ctx.ui.notify("Replaced editor with prompt", "info");
		return;
	}

	if (action === "Append") {
		const separator =
			currentText.endsWith("\n") || selected.startsWith("\n") ? "" : "\n";
		ctx.ui.setEditorText(`${currentText}${separator}${selected}`);
		ctx.ui.notify("Appended prompt", "info");
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerShortcut("alt+s", {
		description: "Stash editor draft (toggle: stash / restore / update)",
		handler: (ctx) => {
			if (ctx.hasUI) stashOrRestore(ctx);
		},
	});

	pi.registerShortcut("ctrl+alt+h", {
		description: "Open stash history picker",
		handler: (ctx) => {
			if (ctx.hasUI) void openStashHistory(ctx);
		},
	});

	pi.registerCommand("stash-history", {
		description: "Pick a stashed prompt and insert it into the editor",
		handler: async (_args, ctx) => {
			if (ctx.hasUI) await openStashHistory(ctx);
		},
	});

	pi.on("session_start", (_event, ctx) => resetStashState(ctx));

	// omp 的 /new、/resume 等会话切换不重发 session_start，改发 session_switch(reason: "new"/…)
	// （agent-session.ts newSession → extensionRunner.emit session_switch）。pi 1.1.0 无此事件：
	// 其 on() 是无校验的 map 注册，未知名只会成为永不触发的监听，运行时无害。
	// @ts-expect-error pi 1.1.0 类型没有 session_switch 事件（omp 专属）
	pi.on("session_switch", (_event, ctx) => resetStashState(ctx));
}

/** active stash 是 session-local，切会话即弃；history 每次重读（pi-powerline :1752/:1760/:1769） */
function resetStashState(ctx: ExtensionContext): void {
	stashedEditorText = null;
	stashHistory = readPersistedStashHistory();
	if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, undefined);
}
