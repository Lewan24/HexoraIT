using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDhcpAndOperationResources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DhcpEnd",
                table: "Subnets",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DhcpStart",
                table: "Subnets",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OperationResourceLinks",
                columns: table => new
                {
                    RecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    Resource = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ResourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationResourceLinks", x => new { x.RecordId, x.Resource, x.ResourceId });
                    table.ForeignKey(
                        name: "FK_OperationResourceLinks_OperationRecords_RecordId_Organizati~",
                        columns: x => new { x.RecordId, x.OrganizationId },
                        principalTable: "OperationRecords",
                        principalColumns: new[] { "Id", "OrganizationId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OperationResourceLinks_OrganizationId_Resource_ResourceId",
                table: "OperationResourceLinks",
                columns: new[] { "OrganizationId", "Resource", "ResourceId" });

            migrationBuilder.CreateIndex(
                name: "IX_OperationResourceLinks_RecordId_OrganizationId",
                table: "OperationResourceLinks",
                columns: new[] { "RecordId", "OrganizationId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OperationResourceLinks");

            migrationBuilder.DropColumn(
                name: "DhcpEnd",
                table: "Subnets");

            migrationBuilder.DropColumn(
                name: "DhcpStart",
                table: "Subnets");
        }
    }
}
