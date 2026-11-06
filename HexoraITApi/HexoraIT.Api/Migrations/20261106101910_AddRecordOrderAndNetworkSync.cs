using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordOrderAndNetworkSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "WarrantyItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Tasks",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Subnets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SyncRevision",
                table: "Subnets",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "StoredFiles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Projects",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "PrivateNotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Plans",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Passwords",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Licenses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "KnowledgeArticles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAutoManaged",
                table: "IPEntries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "IPEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Incidents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Groups",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "FileFolders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "DiagramNodes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Contracts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Contacts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortIndex",
                table: "Assets",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_IPEntries_AssetId",
                table: "IPEntries",
                column: "AssetId",
                unique: true,
                filter: "\"IsAutoManaged\" = TRUE AND \"AssetId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IPEntries_AssetId",
                table: "IPEntries");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "WarrantyItems");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Subnets");

            migrationBuilder.DropColumn(
                name: "SyncRevision",
                table: "Subnets");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "StoredFiles");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "PrivateNotes");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Passwords");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Licenses");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "KnowledgeArticles");

            migrationBuilder.DropColumn(
                name: "IsAutoManaged",
                table: "IPEntries");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "IPEntries");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "FileFolders");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "DiagramNodes");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Contacts");

            migrationBuilder.DropColumn(
                name: "SortIndex",
                table: "Assets");
        }
    }
}
