using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Organizations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Organizations",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Organizations");
        }
    }
}
