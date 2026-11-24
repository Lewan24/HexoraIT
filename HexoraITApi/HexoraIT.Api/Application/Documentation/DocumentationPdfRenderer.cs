using System.Text.RegularExpressions;
using MigraDoc.DocumentObjectModel;
using MigraDoc.Rendering;
using MigraDoc.DocumentObjectModel.Tables;
using PdfSharp.Fonts;
using PdfSharp.Drawing;

namespace HexoraITApi.Application.Documentation;

public interface IDocumentationPdfRenderer
{
    Task<byte[]> RenderAsync(DocumentationSnapshot snapshot, CancellationToken token = default);
}

public sealed partial class DocumentationPdfRenderer : IDocumentationPdfRenderer
{
    private static readonly SemaphoreSlim RenderSlots = new(2);
    private static readonly Lazy<bool> Fonts = new(() => { GlobalFontSettings.FontResolver ??= new EmbeddedDocumentationFonts(); return true; });

    public async Task<byte[]> RenderAsync(DocumentationSnapshot snapshot, CancellationToken token = default)
    {
        await RenderSlots.WaitAsync(token);
        try
        {
            _ = Fonts.Value;
            token.ThrowIfCancellationRequested();
            var document = BuildDocument(snapshot);
            var renderer = new PdfDocumentRenderer { Document = document };
            renderer.RenderDocument();
            token.ThrowIfCancellationRequested();
            using var output = new MemoryStream();
            renderer.PdfDocument.Save(output, false);
            return output.ToArray();
        }
        finally { RenderSlots.Release(); }
    }

    public Document BuildDocument(DocumentationSnapshot snapshot)
    {
        _ = Fonts.Value;
        var pl = snapshot.Options.Language == "pl";
        string T(string key) => DocumentationLabels.Get(key, pl);
        var document = new Document();
        document.Info.Title = string.IsNullOrWhiteSpace(snapshot.Options.Title) ? T("Organization documentation") : Clean(snapshot.Options.Title);
        document.Info.Author = Clean(snapshot.PreparedBy);
        document.Info.Subject = Clean(snapshot.OrganizationName);
        var normal = document.Styles[StyleNames.Normal]!;
        normal.Font.Name = "Documentation Sans";
        normal.Font.Size = 10;
        normal.Font.Color = Color.FromRgb(35, 48, 68);
        normal.ParagraphFormat.SpaceAfter = Unit.FromPoint(5);
        normal.ParagraphFormat.LineSpacingRule = LineSpacingRule.Multiple;
        normal.ParagraphFormat.LineSpacing = 1.2;
        foreach (var (name, size) in new[] { (StyleNames.Heading1, 21), (StyleNames.Heading2, 12), (StyleNames.Heading3, 10) })
        {
            var style = document.Styles[name]!;
            style.Font.Name = "Documentation Sans";
            style.Font.Size = size;
            style.Font.Bold = true;
            style.Font.Color = Color.FromRgb(37, 77, 145);
            style.ParagraphFormat.KeepWithNext = true;
            style.ParagraphFormat.SpaceBefore = Unit.FromPoint(name == StyleNames.Heading1 ? 18 : 12);
            style.ParagraphFormat.SpaceAfter = Unit.FromPoint(8);
        }
        var muted = document.AddStyle("Muted", StyleNames.Normal);
        muted.Font.Size = 8.5;
        muted.Font.Color = Color.FromRgb(82, 98, 120);
        var cover = Page(document, snapshot, false);
        var brand = cover.AddParagraph("HEXORAIT");
        brand.Format.Font.Size = 12;
        brand.Format.Font.Bold = true;
        brand.Format.Font.Color = Color.FromRgb(37, 99, 235);
        brand.Format.Borders.Bottom.Width = Unit.FromPoint(2);
        brand.Format.Borders.Bottom.Color = Color.FromRgb(79, 70, 229);
        brand.Format.Borders.Distance = Unit.FromPoint(12);
        brand.Format.SpaceAfter = Unit.FromCentimeter(3);
        var title = cover.AddParagraph(document.Info.Title);
        title.Format.Font.Size = 32;
        title.Format.Font.Color = Color.FromRgb(25, 39, 63);
        title.Format.Font.Bold = true;
        title.Format.SpaceAfter = Unit.FromCentimeter(0.7);
        var company = cover.AddParagraph(Clean(snapshot.OrganizationName));
        company.Format.Font.Size = 19;
        company.Format.Font.Color = Color.FromRgb(37, 99, 235);
        company.Format.SpaceAfter = Unit.FromCentimeter(1.2);
        foreach (var (label, value) in new[] {
            ("Generated", snapshot.GeneratedAt.ToString("yyyy-MM-dd HH:mm 'UTC'")),
            ("Prepared by", snapshot.PreparedBy), ("Recipient", snapshot.Options.Recipient) })
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            var row = cover.AddParagraph(); row.AddFormattedText(T(label) + ": ", TextFormat.Bold); row.AddText(Clean(value));
        }
        if (snapshot.Description.Length > 0) AddContent(cover, snapshot.Description);
        if (snapshot.Options.IncludeSecrets) cover.AddParagraph(T("Sensitive data: this report includes passwords or license keys."), "Muted");
        if (snapshot.Sections.Any(section => section.Key == "private-notes")) cover.AddParagraph(T("Personal notes: only notes belonging to the report author are included."), "Muted");
        var contents = Page(document, snapshot);
        contents.AddParagraph(T("Contents"), StyleNames.Heading1).Format.SpaceBefore = Unit.Zero;
        for (var i = 0; i < snapshot.Sections.Count; i++)
        {
            var entry = snapshot.Sections[i];
            var row = contents.AddParagraph();
            row.Format.SpaceAfter = Unit.FromPoint(10);
            row.Format.TabStops.AddTabStop(Unit.FromCentimeter(16.4), TabAlignment.Right, TabLeader.Dots);
            row.AddHyperlink($"section-{i}", HyperlinkType.Bookmark).AddText($"{i + 1:00}  {T(entry.Key)} ({entry.Records.Count})");
            row.AddTab();
            row.AddPageRefField($"section-{i}");
        }
        var section = Page(document, snapshot);
        for (var i = 0; i < snapshot.Sections.Count; i++)
        {
            var source = snapshot.Sections[i];
            var heading = section.AddParagraph($"{i + 1:00}  {T(source.Key)}", StyleNames.Heading1);
            heading.AddBookmark($"section-{i}");
            if (i == 0) heading.Format.SpaceBefore = Unit.Zero;
            if (source.Key is "files" or "networks")
            {
                var description = section.AddParagraph(DocumentationLabels.SectionDescription(source.Key, pl), "Muted");
                description.Format.KeepWithNext = true;
            }
            if (source.Records.Count == 0) section.AddParagraph(T("No records in the selected scope."));
            for (var recordIndex = 0; recordIndex < source.Records.Count; recordIndex++)
            {
                var record = source.Records[recordIndex];
                var columns = InventoryColumns.GetValueOrDefault(source.Key);
                var last = recordIndex;
                while (columns is not null && last < source.Records.Count && FitsInventory(source.Records[last], columns)) last++;
                if (last - recordIndex >= 2)
                {
                    AddInventory(section, source.Records.GetRange(recordIndex, last - recordIndex), columns!, pl);
                    recordIndex = last - 1;
                }
                else if (FitsCompactCard(record))
                {
                    var cards = CardTable(section);
                    var row = cards.AddRow();
                    AddCompactCard(row[0], record, pl);
                    if (recordIndex + 1 < source.Records.Count && FitsCompactCard(source.Records[recordIndex + 1]) &&
                        (columns is null || !FitsInventory(source.Records[recordIndex + 1], columns)))
                    {
                        recordIndex++;
                        AddCompactCard(row[2], source.Records[recordIndex], pl);
                    }
                }
                else AddExpandedRecord(section, record, pl);
                var gap = section.AddParagraph();
                gap.Format.Font.Size = 1;
                gap.Format.SpaceAfter = Unit.FromPoint(10);
            }
        }
        return document;
    }

    private static readonly Color CardBackground = Color.FromRgb(245, 247, 252);
    private static readonly Color CardBorder = Color.FromRgb(217, 225, 238);

    // Table rows cannot split across pages. Only bounded, short records use paired cards.
    private static bool FitsCompactCard(DocumentationRecord record) =>
        record.Addresses is null && record.Title.Length <= 90 && record.Fields.Count <= 7 &&
        record.Title.Length + record.Fields.Sum(field => field.Label.Length + field.Value.Length) +
        record.Texts.Sum(text => text.Label.Length + text.Content.Length) <= 480 &&
        record.Fields.All(field => !field.Value.Contains('\n') && field.Value.Length <= 110) &&
        record.Texts.All(text => text.Content.Length <= 120 && !text.Content.Contains('\n'));

    private static Table CardTable(Section section)
    {
        var table = section.AddTable();
        table.Format.KeepWithNext = false;
        table.Format.KeepTogether = false;
        table.LeftPadding = Unit.FromPoint(12);
        table.RightPadding = Unit.FromPoint(12);
        table.TopPadding = Unit.FromPoint(10);
        table.BottomPadding = Unit.FromPoint(10);
        table.AddColumn(Unit.FromCentimeter(8));
        var gutter = table.AddColumn(Unit.FromCentimeter(0.6));
        gutter.LeftPadding = gutter.RightPadding = Unit.Zero;
        table.AddColumn(Unit.FromCentimeter(8));
        return table;
    }

    private static void Decorate(Cell cell)
    {
        cell.Shading.Color = CardBackground;
        cell.Borders.Color = CardBorder;
        cell.Borders.Width = Unit.FromPoint(0.6);
        cell.VerticalAlignment = VerticalAlignment.Top;
    }

    private static readonly Dictionary<string, (string Label, double Weight)[]> InventoryColumns = new()
    {
        ["assets"] = [("Name", 3.5), ("Type", 3), ("IP address", 2.8), ("Location", 2.9), ("Owner", 3.2), ("Serial number", 2.6)],
        ["contacts"] = [("Name", 2.5), ("Company", 2.5), ("Role", 2.8), ("Phone", 2.6), ("Email", 4.6)],
        ["licenses"] = [("Name", 4), ("Vendor", 3), ("License model", 3), ("Seats used / total", 2.5), ("Expiry date", 2.5)],
        ["files"] = [("Name", 7), ("Folder", 5)],
        ["contracts"] = [("Name", 4), ("Vendor", 3), ("Category", 2.5), ("Start date", 2.5), ("End date", 2.5), ("Auto-renewal", 2.5)],
        ["warranty"] = [("Name", 4), ("Vendor", 3), ("Serial number", 3), ("Type", 3), ("Warranty end", 3)]
    };

    private static bool FitsInventory(DocumentationRecord record, (string Label, double Weight)[] columns) =>
        record.Title.Length <= 200 && !record.Title.Contains('\n') && record.Texts.Count == 0 &&
        record.Fields.All(field => field.Value.Length <= 200 && !field.Value.Contains('\n') && columns.Any(column => column.Label == field.Label));

    private static void AddInventory(Section section, List<DocumentationRecord> records, (string Label, double Weight)[] columns, bool pl)
    {
        var populated = records.SelectMany(record => record.Fields).Select(field => field.Label).ToHashSet();
        var visible = columns.Where(column => column.Label == "Name" || populated.Contains(column.Label)).ToArray();
        if (visible.Length == 1)
        {
            foreach (var record in records)
            {
                var item = section.AddParagraph();
                AddWrappedText(item, "• " + Clean(record.Title));
            }
            return;
        }
        var table = DataTable(section, visible, pl);
        foreach (var record in records)
            AddDataRow(table, visible.Select(column => column.Label == "Name" ? record.Title :
                record.Fields.FirstOrDefault(field => field.Label == column.Label) is { } value ? FieldValue(value, pl) : "").ToArray());
    }

    private static Table DataTable(Section section, (string Label, double Weight)[] columns, bool pl)
    {
        var table = section.AddTable();
        table.TopPadding = table.BottomPadding = Unit.FromPoint(5);
        table.LeftPadding = table.RightPadding = Unit.FromPoint(5);
        var total = columns.Sum(column => column.Weight);
        foreach (var column in columns) table.AddColumn(Unit.FromCentimeter(16.6 * column.Weight / total));
        var header = AddDataRow(table, columns.Select(column => DocumentationLabels.Get(column.Label, pl)).ToArray(), true);
        header.HeadingFormat = true;
        return table;
    }

    private static Row AddDataRow(Table table, string[] values, bool header = false)
    {
        var row = table.AddRow();
        for (var i = 0; i < values.Length; i++)
        {
            var cell = row[i];
            cell.Shading.Color = header ? Color.FromRgb(37, 77, 145) : row.Index % 2 == 0 ? CardBackground : Colors.White;
            cell.Borders.Bottom.Color = CardBorder;
            cell.Borders.Bottom.Width = Unit.FromPoint(0.5);
            var paragraph = cell.AddParagraph();
            paragraph.Format.SpaceAfter = Unit.Zero;
            paragraph.Format.Font.Size = 9;
            paragraph.Format.Font.Bold = header || i == 0;
            if (header) paragraph.Format.Font.Color = Colors.White;
            AddWrappedText(paragraph, Clean(values[i].Length == 0 ? "—" : values[i]), table.Columns[i].Width.Point - 11, header || i == 0, 9);
        }
        return row;
    }

    private static string FieldValue(DocumentationField field, bool pl) =>
        field.Translate ? DocumentationLabels.Get(field.Value, pl) : field.Value;

    private static void AddCompactCard(Cell cell, DocumentationRecord record, bool pl)
    {
        Decorate(cell);
        var title = cell.AddParagraph();
        title.Format.Font.Size = 12;
        title.Format.Font.Bold = true;
        title.Format.SpaceAfter = Unit.FromPoint(8);
        AddWrappedText(title, Clean(record.Title), 165, true);
        foreach (var field in record.Fields) AddField(() => cell.AddParagraph(), field, pl, 200);
        foreach (var text in record.Texts)
        {
            cell.AddParagraph(DocumentationLabels.Get(text.Label, pl)).Style = "Muted";
            AddContent(() => cell.AddParagraph(), text.Content, width: 200);
        }
    }

    private static void AddField(Func<Paragraph> addParagraph, DocumentationField field, bool pl, double width)
    {
        var paragraph = addParagraph();
        paragraph.Format.SpaceAfter = Unit.FromPoint(4);
        paragraph.AddFormattedText(DocumentationLabels.Get(field.Label, pl) + ": ", TextFormat.Bold);
        var secret = field.Label is "Password" or "License key";
        if (secret) paragraph.Format.Shading.Color = Color.FromRgb(229, 234, 247);
        AddWrappedText(paragraph, Clean(FieldValue(field, pl)), width);
    }

    private static void AddExpandedRecord(Section section, DocumentationRecord record, bool pl)
    {
        var title = section.AddParagraph("", StyleNames.Heading2);
        AddWrappedText(title, Clean(record.Title), 360, true);
        foreach (var field in record.Fields) AddField(() => section.AddParagraph(), field, pl, 415);
        foreach (var text in record.Texts)
        {
            section.AddParagraph(DocumentationLabels.Get(text.Label, pl), StyleNames.Heading3);
            AddContent(section, text.Content);
        }
        if (record.Addresses is not { Count: > 0 } addresses) return;
        section.AddParagraph(DocumentationLabels.Get("Address assignments", pl), StyleNames.Heading3);
        var columns = new List<(string Label, double Weight)> { ("IP address", 3.5) };
        var hasLabels = addresses.Any(address => !string.IsNullOrWhiteSpace(address.Label));
        if (hasLabels) columns.Add(("Assignment", 5.5));
        columns.Add(("Status", 2.6));
        var table = DataTable(section, columns.ToArray(), pl);
        foreach (var address in addresses)
        {
            var status = DocumentationLabels.Get(address.Status, pl);
            AddDataRow(table, hasLabels ? [address.Ip, address.Label, status] : [address.Ip, status]);
        }
        foreach (var address in addresses)
        {
            if (string.IsNullOrWhiteSpace(address.Notes) && string.IsNullOrWhiteSpace(address.Details)) continue;
            section.AddParagraph($"{DocumentationLabels.Get("IP notes", pl)} · {address.Ip}", StyleNames.Heading3);
            if (!string.IsNullOrWhiteSpace(address.Notes)) AddContent(section, address.Notes);
            if (!string.IsNullOrWhiteSpace(address.Details)) AddContent(section, address.Details, literal: true);
        }
    }

    private static Section Page(Document document, DocumentationSnapshot snapshot, bool header = true)
    {
        var section = document.AddSection();
        section.PageSetup.PageFormat = PageFormat.A4;
        section.PageSetup.TopMargin = Unit.FromCentimeter(2.2);
        section.PageSetup.BottomMargin = Unit.FromCentimeter(2.2);
        section.PageSetup.LeftMargin = Unit.FromCentimeter(2.2);
        section.PageSetup.RightMargin = Unit.FromCentimeter(2.2);
        section.Headers.Primary = new HeaderFooter();
        section.Footers.Primary = new HeaderFooter();
        if (header)
        {
            var title = section.Headers.Primary.AddParagraph(Clean(snapshot.OrganizationName));
            title.Style = "Muted";
            title.Format.Borders.Bottom.Width = Unit.FromPoint(0.5);
            title.Format.Borders.Bottom.Color = Color.FromRgb(220, 226, 235);
        }
        var footer = section.Footers.Primary.AddParagraph();
        footer.Style = "Muted";
        footer.Format.Alignment = ParagraphAlignment.Right;
        footer.AddText("HexoraIT  ·  ");
        footer.AddPageField(); footer.AddText(" / "); footer.AddNumPagesField();
        return section;
    }

    private static void AddContent(Section section, string content, bool literal = false) =>
        AddContent(() => section.AddParagraph(), content, literal);

    private static void AddContent(Func<Paragraph> addParagraph, string content, bool literal = false, double width = 446)
    {
        var code = false;
        foreach (var rawLine in Clean(content).Replace("\r", "").Split('\n'))
        {
            if (!literal && rawLine.TrimStart().StartsWith("```")) { code = !code; continue; }
            if (rawLine.Length == 0) { addParagraph().Format.SpaceAfter = Unit.FromPoint(2); continue; }
            var line = rawLine;
            var paragraph = addParagraph();
            if (literal) { AddWrappedText(paragraph, line, width); continue; }
            if (code) { paragraph.Format.Font.Size = 8; paragraph.Format.Shading.Color = Color.FromRgb(242, 245, 250); AddWrappedText(paragraph, line, width); continue; }
            if (line.StartsWith('#')) { line = line.TrimStart('#', ' '); paragraph.Format.Font.Bold = true; paragraph.Format.SpaceBefore = Unit.FromPoint(8); paragraph.Format.KeepWithNext = true; }
            if (line.StartsWith("- ") || line.StartsWith("* ")) line = "• " + line[2..];
            var offset = 0;
            foreach (Match match in BoldMarkup().Matches(line))
            {
                AddWrappedText(paragraph, line[offset..match.Index], width);
                var bold = paragraph.AddFormattedText();
                bold.Bold = true;
                // Keep Markdown emphasis while allowing oversized tokens to wrap.
                var emphasized = match.Groups[1].Value;
                foreach (var part in WrapTokens(emphasized, width, true))
                    if (part is null) bold.AddLineBreak(); else bold.AddText(part);
                offset = match.Index + match.Length;
            }
            AddWrappedText(paragraph, line[offset..], width);
        }
    }
    private static void AddWrappedText(Paragraph paragraph, string value, double width = 446, bool bold = false, double fontSize = 10)
    {
        foreach (var part in WrapTokens(value, width, bold, fontSize))
            if (part is null) paragraph.AddLineBreak(); else paragraph.AddText(part);
    }

    // Break only overlong tokens, measuring the embedded font rather than guessing by character count.
    // Line breaks are layout elements; the original value is neither shortened nor decorated with hyphens.
    private static IEnumerable<string?> WrapTokens(string value, double width, bool bold, double fontSize = 10)
    {
        var tokens = width < 100 ? NarrowToken() : LongToken();
        if (!tokens.IsMatch(value)) { yield return value; yield break; }
        using var graphics = XGraphics.CreateMeasureContext(new XSize(1000, 1000), XGraphicsUnit.Point, XPageDirection.Downwards);
        var font = new XFont("Documentation Sans", fontSize, bold ? XFontStyleEx.Bold : XFontStyleEx.Regular);
        var offset = 0;
        foreach (Match match in tokens.Matches(value))
        {
            yield return value[offset..match.Index];
            var token = match.Value;
            var start = 0;
            while (start < token.Length)
            {
                var low = 1;
                var high = Math.Min(token.Length - start, 256);
                while (low < high)
                {
                    var middle = (low + high + 1) / 2;
                    if (graphics.MeasureString(token.Substring(start, middle), font).Width <= width) low = middle;
                    else high = middle - 1;
                }
                if (start + low < token.Length && char.IsHighSurrogate(token[start + low - 1])) low--;
                if (low == 0) low = 2;
                yield return token.Substring(start, low);
                start += low;
                if (start < token.Length) yield return null;
            }
            offset = match.Index + match.Length;
        }
        yield return value[offset..];
    }
    [GeneratedRegex(@"\S{8,}", RegexOptions.CultureInvariant)] private static partial Regex NarrowToken();
    [GeneratedRegex(@"\S{25,}", RegexOptions.CultureInvariant)] private static partial Regex LongToken();
    private static string Clean(string value) => new(value.Where(c => !char.IsControl(c) || c is '\n' or '\r' or '\t').ToArray());
    [GeneratedRegex(@"\*\*(.+?)\*\*", RegexOptions.CultureInvariant)] private static partial Regex BoldMarkup();
}

internal sealed class EmbeddedDocumentationFonts : IFontResolver
{
    private static readonly Lazy<byte[]> Regular = new(() => Load("DejaVuSans.ttf"));
    private static readonly Lazy<byte[]> Bold = new(() => Load("DejaVuSans-Bold.ttf"));
    public FontResolverInfo ResolveTypeface(string familyName, bool bold, bool italic) => new(bold ? "documentation-bold" : "documentation-regular", false, italic);
    public byte[] GetFont(string faceName) => faceName == "documentation-bold" ? Bold.Value : Regular.Value;
    private static byte[] Load(string name)
    {
        var assembly = typeof(EmbeddedDocumentationFonts).Assembly;
        using var stream = assembly.GetManifestResourceStream(assembly.GetManifestResourceNames().Single(path => path.EndsWith('.' + name, StringComparison.Ordinal)))!;
        using var memory = new MemoryStream(); stream.CopyTo(memory); return memory.ToArray();
    }
}
