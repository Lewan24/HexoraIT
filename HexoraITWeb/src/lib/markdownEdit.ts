export type MarkdownAction = "bold" | "code" | "heading" | "list" | "checklist"

export function markdownEdit(
  value: string,
  start: number,
  end: number,
  action: MarkdownAction,
) {
  if (action === "bold" || action === "code") {
    const marker = action === "bold" ? "**" : "`"
    const selected = value.slice(start, end)
    return {
      value:
        value.slice(0, start) + marker + selected + marker + value.slice(end),
      start: start + marker.length,
      end: end + marker.length,
    }
  }
  const lineStart = value.lastIndexOf("\n", start - 1) + 1
  const prefix =
    action === "heading" ? "## " : action === "list" ? "- " : "- [ ] "
  const selected = value.slice(lineStart, end)
  const inserted = selected
    .split("\n")
    .map((line) => prefix + line)
    .join("\n")
  return {
    value: value.slice(0, lineStart) + inserted + value.slice(end),
    start: start + prefix.length,
    end: end + inserted.length - selected.length,
  }
}
