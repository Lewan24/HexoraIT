using System.Text.RegularExpressions;
using MigraDoc.DocumentObjectModel;
using MigraDoc.Rendering;
using PdfSharp.Fonts;

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
        var pl = snapshot.Options.Language == "pl";
        string T(string key) => DocumentationLabels.Get(key, pl);
        var document = new Document();
        document.Info.Title = string.IsNullOrWhiteSpace(snapshot.Options.Title) ? T("Organization documentation") : Clean(snapshot.Options.Title);
        document.Info.Author = Clean(snapshot.PreparedBy);
        document.Info.Subject = Clean(snapshot.OrganizationName);
        var normal = document.Styles[StyleNames.Normal]!;
        normal.Font.Name = "Documentation Sans";
        normal.Font.Size = 9;
        normal.Font.Color = Color.FromRgb(35, 48, 68);
        normal.ParagraphFormat.SpaceAfter = Unit.FromPoint(5);
        normal.ParagraphFormat.LineSpacingRule = LineSpacingRule.Multiple;
        normal.ParagraphFormat.LineSpacing = 1.15;
        foreach (var (name, size) in new[] { (StyleNames.Heading1, 21), (StyleNames.Heading2, 12), (StyleNames.Heading3, 10) })
        {
            var style = document.Styles[name]!;
            style.Font.Name = "Documentation Sans";
            style.Font.Size = size;
            style.Font.Bold = true;
            style.Font.Color = Color.FromRgb(37, 77, 145);
            style.ParagraphFormat.KeepWithNext = true;
            style.ParagraphFormat.SpaceBefore = Unit.FromPoint(name == StyleNames.Heading1 ? 0 : 12);
            style.ParagraphFormat.SpaceAfter = Unit.FromPoint(8);
        }
        var muted = document.AddStyle("Muted", StyleNames.Normal);
        muted.Font.Size = 8;
        muted.Font.Color = Color.FromRgb(107, 119, 139);
        var cover = Page(document, snapshot, false);
        var brand = cover.AddParagraph("HEXORAIT");
        brand.Format.Font.Size = 12;
        brand.Format.Font.Bold = true;
        brand.Format.Font.Color = Color.FromRgb(37, 99, 235);
        brand.Format.SpaceAfter = Unit.FromCentimeter(3);
        var title = cover.AddParagraph(document.Info.Title);
        title.Format.Font.Size = 30;
        title.Format.Font.Bold = true;
        title.Format.SpaceAfter = Unit.FromCentimeter(0.7);
        var company = cover.AddParagraph(Clean(snapshot.OrganizationName));
        company.Format.Font.Size = 19;
        company.Format.Font.Color = Color.FromRgb(37, 99, 235);
        company.Format.SpaceAfter = Unit.FromCentimeter(1.2);
        foreach (var (label, value) in new[] {
            ("Generated", snapshot.GeneratedAt.ToString("yyyy-MM-dd HH:mm 'UTC'")),
            ("Prepared by", snapshot.PreparedBy), ("Recipient", snapshot.Options.Recipient),
            ("Sections", snapshot.Sections.Count.ToString()), ("Records", snapshot.Sections.Sum(section => section.Records.Count).ToString()) })
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            var row = cover.AddParagraph(); row.AddFormattedText(T(label) + ": ", TextFormat.Bold); row.AddText(Clean(value));
        }
        if (snapshot.Description.Length > 0) AddContent(cover, snapshot.Description);
        var scope = cover.AddParagraph(T("This document contains only the selected sections and fields. File attachments are listed, not embedded."));
        scope.Style = "Muted"; scope.Format.SpaceBefore = Unit.FromCentimeter(1);
        if (snapshot.Options.IncludeSecrets) cover.AddParagraph(T("Sensitive data: this report includes passwords or license keys."), "Muted");
        if (snapshot.Sections.Any(section => section.Key == "private-notes")) cover.AddParagraph(T("Personal notes: only notes belonging to the report author are included."), "Muted");
        var contents = Page(document, snapshot);
        contents.AddParagraph(T("Contents"), StyleNames.Heading1);
        for (var i = 0; i < snapshot.Sections.Count; i++)
        {
            var section = snapshot.Sections[i];
            var row = contents.AddParagraph();
            row.Format.SpaceAfter = Unit.FromPoint(10);
            row.Format.TabStops.AddTabStop(Unit.FromCentimeter(16.4), TabAlignment.Right, TabLeader.Dots);
            row.AddText($"{i + 1:00}  {T(section.Key)} ({section.Records.Count})\t");
            row.AddPageRefField($"section-{i}");
        }
        for (var i = 0; i < snapshot.Sections.Count; i++)
        {
            var source = snapshot.Sections[i];
            var section = Page(document, snapshot);
            var heading = section.AddParagraph($"{i + 1:00}  {T(source.Key)}", StyleNames.Heading1);
            heading.AddBookmark($"section-{i}");
            section.AddParagraph($"{T("Records")}: {source.Records.Count}", "Muted");
            if (source.Records.Count == 0) section.AddParagraph(T("No records in the selected scope."));
            for (var recordIndex = 0; recordIndex < source.Records.Count; recordIndex++)
            {
                var record = source.Records[recordIndex];
                section.AddParagraph($"{i + 1}.{recordIndex + 1}  {(record.SortIndex is { } index ? $"[#{index}] " : "")}{Clean(record.Title)}", StyleNames.Heading2);
                foreach (var field in record.Fields)
                {
                    var paragraph = section.AddParagraph();
                    paragraph.AddFormattedText(T(field.Label) + ": ", TextFormat.Bold);
                    paragraph.AddText(Clean(field.Translate ? T(field.Value) : field.Value));
                }
                foreach (var text in record.Texts)
                {
                    section.AddParagraph(T(text.Label), StyleNames.Heading3);
                    AddContent(section, text.Content);
                }
            }
        }
        return document;
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

    private static void AddContent(Section section, string content)
    {
        var code = false;
        foreach (var rawLine in Clean(content).Replace("\r", "").Split('\n'))
        {
            if (rawLine.TrimStart().StartsWith("```")) { code = !code; continue; }
            if (rawLine.Length == 0) { section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(2); continue; }
            var line = rawLine;
            var paragraph = section.AddParagraph();
            if (code) { paragraph.Format.Font.Size = 8; paragraph.Format.Shading.Color = Color.FromRgb(242, 245, 250); paragraph.AddText(line); continue; }
            if (line.StartsWith('#')) { line = line.TrimStart('#', ' '); paragraph.Format.Font.Bold = true; paragraph.Format.SpaceBefore = Unit.FromPoint(8); paragraph.Format.KeepWithNext = true; }
            if (line.StartsWith("- ") || line.StartsWith("* ")) line = "• " + line[2..];
            var offset = 0;
            foreach (Match match in BoldMarkup().Matches(line))
            {
                paragraph.AddText(line[offset..match.Index]);
                paragraph.AddFormattedText(match.Groups[1].Value, TextFormat.Bold);
                offset = match.Index + match.Length;
            }
            paragraph.AddText(line[offset..]);
        }
    }
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
