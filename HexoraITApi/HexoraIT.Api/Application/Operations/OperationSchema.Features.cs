using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace HexoraITApi.Application.Operations;

public static partial class OperationSchemas
{
    public static readonly string[] Operators = ["equals", "notEquals", "in", "notIn", "empty", "notEmpty", "greaterThan", "lessThan"];
    private static readonly IReadOnlyDictionary<string, string> Patterns = new Dictionary<string, string>
    {
        ["guid"] = @"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        ["hostname"] = @"^[a-zA-Z0-9][a-zA-Z0-9.-]{0,251}[a-zA-Z0-9]$", ["sha256"] = @"^[a-fA-F0-9]{64}$"
    };

    private static void CheckFeatures(OperationField f, OperationField[] scope)
    {
        if (f.MinLength < 0 || f.MinLength > f.MaxLength || f.MaxItems is < 1 or > 50 || f.Minimum > f.Maximum || f.Sensitivity is not ("Normal" or "Restricted" or "Secret")) throw new ArgumentException("Invalid field constraints.");
        if (f.Type is not ("select" or "radio" or "multiselect") && f.Options is not null) throw new ArgumentException("Options require a choice field.");
        if (f.Pattern is not null && (!Patterns.ContainsKey(f.Pattern) || f.Type is not ("text" or "multiline"))) throw new ArgumentException("Only named safe text patterns are allowed.");
        if (f.Sensitivity == "Secret" && (f.Required || f.DefaultValue.HasValue || f.Fields is not null)) throw new ArgumentException("Secret fields are instructions only.");
        if (f.Sensitivity == "Restricted" && f.DefaultValue.HasValue) throw new ArgumentException("Restricted fields cannot publish defaults.");
        if (f.VisibleWhen is not null) { var count = 0; CheckCondition(f.VisibleWhen, scope, f.Key, 0, ref count); }
        if (f.DefaultValue is { } initial)
        {
            if (f.Type == "table" || f.Type is "select" or "radio" or "multiselect" && f.Options is null) throw new ArgumentException("Invalid default.");
            var values = JsonSerializer.SerializeToElement(new Dictionary<string, JsonElement> { [f.Key] = initial });
            if (Validate(new(1, "DEFAULT", new("Default", "Domyślne"), new("Default", "Domyślne"), ["Validation"], [f with { Required = false, DefaultValue = null, VisibleWhen = null }]), values, false).Count > 0) throw new ArgumentException("Invalid field default.");
        }
    }

    private static void CheckCondition(OperationCondition c, OperationField[] scope, string owner, int depth, ref int count)
    {
        if (c is null || depth > 3 || c.Match is not ("AND" or "OR") || c.Rules is null || c.Rules.Length > 20 || (c.Groups?.Length ?? 0) > 10 || c.Rules.Length + (c.Groups?.Length ?? 0) == 0 || (count += c.Rules.Length + 1) > 40) throw new ArgumentException("Invalid condition depth/count.");
        foreach (var rule in c.Rules)
        {
            if (rule is null || string.IsNullOrEmpty(rule.Field) || rule.Field == owner || !scope.Any(f => f is not null && f.Key == rule.Field) ||
                scope.Any(f => f is not null && f.Key == rule.Field && (Protected(f) || f.Sensitivity == "Secret")) || !Operators.Contains(rule.Operator)) throw new ArgumentException("Invalid condition field/operator.");
            if (rule.Operator is "empty" or "notEmpty") { if (rule.Value.HasValue) throw new ArgumentException("Empty conditions do not accept a value."); continue; }
            if (rule.Value is not { } value) throw new ArgumentException("Condition value is required.");
            if (rule.Operator is "greaterThan" or "lessThan") { if (value.ValueKind != JsonValueKind.Number || !value.TryGetDecimal(out _)) throw new ArgumentException("Numeric condition value required."); }
            else if (rule.Operator is "in" or "notIn")
            {
                if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() is < 1 or > 50 || value.EnumerateArray().Any(v => !Primitive(v))) throw new ArgumentException("Bounded primitive choices required.");
            }
            else if (!Primitive(value)) throw new ArgumentException("Primitive condition value required.");
        }
        foreach (var group in c.Groups ?? []) CheckCondition(group, scope, owner, depth + 1, ref count);
    }
    private static bool Primitive(JsonElement v) => v.ValueKind is JsonValueKind.String or JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False or JsonValueKind.Null;
    private static bool Empty(JsonElement v) => v.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null || v.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(v.GetString()) || v.ValueKind == JsonValueKind.Array && v.GetArrayLength() == 0;
    private static bool Equal(JsonElement a, JsonElement b) => a.ValueKind == JsonValueKind.Number && b.ValueKind == JsonValueKind.Number && a.TryGetDecimal(out var an) && b.TryGetDecimal(out var bn) ? an == bn : JsonElement.DeepEquals(a.ValueKind == JsonValueKind.Undefined ? JsonSerializer.SerializeToElement<object?>(null) : a, b);
    public static bool Visible(OperationCondition? condition, JsonElement scope, JsonElement root)
    {
        if (condition is null) return true;
        bool Test(OperationPredicate rule)
        {
            if (!scope.TryGetProperty(rule.Field, out var actual)) root.TryGetProperty(rule.Field, out actual);
            var value = rule.Value ?? default;
            return rule.Operator switch
            {
                "equals" => Equal(actual, value), "notEquals" => !Equal(actual, value), "empty" => Empty(actual), "notEmpty" => !Empty(actual),
                "in" => value.EnumerateArray().Any(v => Equal(actual, v)), "notIn" => !value.EnumerateArray().Any(v => Equal(actual, v)),
                "greaterThan" => actual.ValueKind == JsonValueKind.Number && actual.TryGetDecimal(out var a) && a > value.GetDecimal(),
                "lessThan" => actual.ValueKind == JsonValueKind.Number && actual.TryGetDecimal(out var b) && b < value.GetDecimal(), _ => false
            };
        }
        var tests = condition.Rules.Select(Test).Concat((condition.Groups ?? []).Select(g => Visible(g, scope, root)));
        return condition.Match == "AND" ? tests.All(x => x) : tests.Any(x => x);
    }

    private static bool CheckTypedValue(OperationField f, JsonElement value, bool exists, bool required, string key, Dictionary<string, string[]> errors)
    {
        if (f.Type is not ("integer" or "decimal" or "boolean" or "checkbox" or "multiselect")) return false;
        if (!exists) { if (required) errors[key] = ["Required."]; return true; }
        if (f.Type is "boolean" or "checkbox") { if (value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) errors[key] = ["Expected true or false."]; }
        else if (f.Type == "multiselect")
        {
            if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() > f.MaxItems || required && value.GetArrayLength() == 0 || value.EnumerateArray().Any(v => v.ValueKind != JsonValueKind.String || !f.Options!.Contains(v.GetString())) || value.EnumerateArray().Select(v => v.ToString()).Distinct().Count() != value.GetArrayLength()) errors[key] = ["Invalid choices."];
        }
        else if (value.ValueKind != JsonValueKind.Number || !value.TryGetDecimal(out var number) || f.Type == "integer" && decimal.Truncate(number) != number) errors[key] = ["Invalid number."];
        else if (number < f.Minimum || number > f.Maximum) errors[key] = ["Number is outside the allowed range."];
        return true;
    }
    private static void CheckTextFeatures(OperationField f, string text, string key, Dictionary<string, string[]> errors)
    {
        if (text.Length > 0 && text.Length < f.MinLength) errors[key] = ["Value is too short."];
        if (text.Length > 0 && f.Pattern is not null && !Regex.IsMatch(text, Patterns[f.Pattern], RegexOptions.NonBacktracking | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100))) errors[key] = ["Value does not match the allowed format."];
    }

    // A mixed table is protected as a whole so row manipulation cannot expose or misassociate hidden cells.
    public static bool Protected(OperationField field) => field is not null && (field.Sensitivity == "Restricted" || field.Fields?.Any(Protected) == true);
    public static OperationSchema PublicSchema(OperationSchema schema, bool sensitive) => schema with { Fields = schema.Fields.Where(f => sensitive || !Protected(f)).ToArray() };
    public static bool WritesProtected(OperationSchema schema, JsonElement values) => values.ValueKind == JsonValueKind.Object && schema.Fields.Any(f => Protected(f) && values.TryGetProperty(f.Key, out _));
    public static JsonElement PrepareValues(OperationSchema schema, JsonElement values, bool sensitive, JsonElement? existing = null)
    {
        if (values.ValueKind != JsonValueKind.Object) return values;
        var node = JsonNode.Parse(values.GetRawText())!.AsObject();
        foreach (var f in schema.Fields)
        {
            if (f.Sensitivity == "Secret") { node.Remove(f.Key); continue; }
            if (!node.ContainsKey(f.Key) && f.DefaultValue is { } value) node[f.Key] = JsonNode.Parse(value.GetRawText());
            if (f.Type == "table" && node[f.Key] is JsonArray rows)
                foreach (var row in rows.OfType<JsonObject>()) foreach (var child in f.Fields!)
                    if (child.Sensitivity == "Secret") row.Remove(child.Key);
                    else if (!row.ContainsKey(child.Key) && child.DefaultValue is { } initial) row[child.Key] = JsonNode.Parse(initial.GetRawText());
            if (!sensitive && Protected(f) && existing is { ValueKind: JsonValueKind.Object } old && old.TryGetProperty(f.Key, out var protectedValue)) node[f.Key] = JsonNode.Parse(protectedValue.GetRawText());
        }
        return JsonSerializer.SerializeToElement(node);
    }
    public static JsonElement PublicValues(OperationSchema schema, JsonElement values, bool sensitive)
    {
        var node = JsonNode.Parse(values.GetRawText())!.AsObject();
        foreach (var f in schema.Fields)
        {
            if (f.Sensitivity == "Secret" || !sensitive && Protected(f)) { node.Remove(f.Key); continue; }
            if (f.Type == "table" && node[f.Key] is JsonArray rows) foreach (var row in rows.OfType<JsonObject>()) foreach (var child in f.Fields!.Where(c => c.Sensitivity == "Secret")) row.Remove(child.Key);
        }
        return JsonSerializer.SerializeToElement(node);
    }
}
