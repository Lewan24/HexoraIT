using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddContractDocument : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentBlobPath",
                table: "Contracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocumentMimeType",
                table: "Contracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocumentName",
                table: "Contracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "DocumentSize",
                table: "Contracts",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentBlobPath",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "DocumentMimeType",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "DocumentName",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "DocumentSize",
                table: "Contracts");
        }
    }
}
