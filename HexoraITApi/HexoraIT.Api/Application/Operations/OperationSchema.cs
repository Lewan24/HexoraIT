using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HexoraITApi.Application.Operations;

public sealed record OperationLabel(string En, string Pl);
public sealed record OperationField(string Key, OperationLabel Label, string Type = "text", bool Required = false,
    int MaxLength = 4000, string[]? Options = null, OperationField[]? Fields = null, OperationLabel? Help = null);
public sealed record OperationSchema(int SchemaVersion, string Key, OperationLabel Name, OperationLabel Description,
    string[] Controls, OperationField[] Fields);

/// <summary>Closed declarative subset. Unsupported capabilities fail closed, never execute code.</summary>
public static class OperationSchemas
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { MaxDepth = 12, UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow };
    public const int MaxBytes = 128_000;
    public static string Serialize(OperationSchema schema) => JsonSerializer.Serialize(schema, Json);
    public static string Hash(string json) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));

    public static OperationSchema Parse(string json)
    {
        if (Encoding.UTF8.GetByteCount(json) > MaxBytes) throw new ArgumentException("Template is too large.");
        var schema = JsonSerializer.Deserialize<OperationSchema>(json, Json) ?? throw new ArgumentException("Invalid template.");
        if (schema.SchemaVersion != 1 || schema.Key is not ("A02" or "A06" or "D02") ||
            !LabelValid(schema.Name) || !LabelValid(schema.Description) || schema.Controls is not { Length: > 0 and <= 20 } ||
            schema.Controls.Any(c => string.IsNullOrWhiteSpace(c) || c.Length > 200)) throw new ArgumentException("Invalid template metadata.");
        CheckFields(schema.Fields, 0);
        return schema;
    }

    private static bool LabelValid(OperationLabel? label) => label is not null &&
        !string.IsNullOrWhiteSpace(label.En) && !string.IsNullOrWhiteSpace(label.Pl) && label.En.Length <= 1000 && label.Pl.Length <= 1000;

    private static void CheckFields(OperationField[]? fields, int depth)
    {
        if (fields is not { Length: > 0 and <= 60 } || depth > 1) throw new ArgumentException("Invalid field depth/count.");
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var f in fields)
        {
            if (f is null || string.IsNullOrEmpty(f.Key) || f.Key.Length > 60 || !f.Key.All(c => char.IsAsciiLetterOrDigit(c) || c == '_') || !keys.Add(f.Key) ||
                !LabelValid(f.Label) || f.MaxLength is < 1 or > 10000 || (f.Help is not null && !LabelValid(f.Help))) throw new ArgumentException("Invalid field metadata.");
            if (f.Type is not ("text" or "multiline" or "date" or "datetime" or "select" or "table" or "url")) throw new ArgumentException("Unsupported field type.");
            if (f.Type == "select" && (f.Options is not { Length: > 0 and <= 50 } || f.Options.Any(o => string.IsNullOrWhiteSpace(o) || o.Length > 100) || f.Options.Distinct().Count() != f.Options.Length)) throw new ArgumentException("Invalid options.");
            if (f.Type == "table") CheckFields(f.Fields, depth + 1);
            else if (f.Fields is not null) throw new ArgumentException("Only tables may have children.");
        }
    }

    public static Dictionary<string, string[]> Validate(OperationSchema schema, JsonElement values, bool complete)
    {
        var errors = new Dictionary<string, string[]>();
        if (values.ValueKind != JsonValueKind.Object || Encoding.UTF8.GetByteCount(values.GetRawText()) > MaxBytes)
        { errors["values"] = ["Expected a bounded object."]; return errors; }
        CheckValues(schema.Fields, values, complete, "", errors);
        if (complete && schema.Key == "D02" && values.TryGetProperty("outcome", out var outcome) && outcome.GetString() == "Successful")
            foreach (var key in new[] { "integrity", "functionality" })
                if (!values.TryGetProperty(key, out var test) || string.IsNullOrWhiteSpace(test.GetString())) errors[key] = ["Verification results are required for success."];
        return errors;
    }

    private static void CheckValues(OperationField[] fields, JsonElement values, bool complete, string prefix, Dictionary<string, string[]> errors)
    {
        var seen = new HashSet<string>();
        foreach (var prop in values.EnumerateObject())
            if (!seen.Add(prop.Name) || !fields.Any(f => f.Key == prop.Name)) errors[prefix + prop.Name] = ["Unknown or duplicate field."];
        foreach (var f in fields)
        {
            var key = prefix + f.Key;
            var exists = values.TryGetProperty(f.Key, out var value) && value.ValueKind != JsonValueKind.Null;
            if (f.Type == "table")
            {
                if (!exists) { if (complete && f.Required) errors[key] = ["Required."]; continue; }
                if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() > 50 || (complete && f.Required && value.GetArrayLength() == 0))
                { errors[key] = ["Expected 1–50 rows."]; continue; }
                var i = 0;
                foreach (var row in value.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Object) errors[$"{key}.{i}"] = ["Expected an object."];
                    else CheckValues(f.Fields!, row, complete, $"{key}.{i}.", errors);
                    i++;
                }
                continue;
            }
            if (exists && value.ValueKind != JsonValueKind.String) { errors[key] = ["Expected text."]; continue; }
            var text = exists ? value.GetString() ?? "" : "";
            if (complete && f.Required && string.IsNullOrWhiteSpace(text)) errors[key] = ["Required."];
            if (text.Length > f.MaxLength) errors[key] = ["Value is too long."];
            if (text.Length == 0) continue;
            if (f.Type == "select" && !f.Options!.Contains(text)) errors[key] = ["Invalid option."];
            if (f.Type == "date" && !DateOnly.TryParseExact(text, "yyyy-MM-dd", out _)) errors[key] = ["Invalid date."];
            if (f.Type == "datetime" && !DateTimeOffset.TryParse(text, out _)) errors[key] = ["Invalid date/time."];
            if (f.Type == "url" && (!Uri.TryCreate(text, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))) errors[key] = ["Only HTTP(S) URLs are allowed."];
        }
    }
}
