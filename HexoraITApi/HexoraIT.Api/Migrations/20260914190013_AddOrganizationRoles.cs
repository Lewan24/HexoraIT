using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HexoraITApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CustomRoleId",
                table: "UserOrganizations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrganizationRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationRoles", x => x.Id);
                    table.UniqueConstraint("AK_OrganizationRoles_Id_OrganizationId", x => new { x.Id, x.OrganizationId });
                    table.ForeignKey(
                        name: "FK_OrganizationRoles_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Resource = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ResourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    CanRead = table.Column<bool>(type: "boolean", nullable: false),
                    CanWrite = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_OrganizationRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "OrganizationRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserOrganizations_CustomRoleId_OrganizationId",
                table: "UserOrganizations",
                columns: new[] { "CustomRoleId", "OrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRoles_OrganizationId_Name",
                table: "OrganizationRoles",
                columns: new[] { "OrganizationId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_Resource_ResourceId",
                table: "RolePermissions",
                columns: new[] { "RoleId", "Resource", "ResourceId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_UserOrganizations_OrganizationRoles_CustomRoleId_Organizati~",
                table: "UserOrganizations",
                columns: new[] { "CustomRoleId", "OrganizationId" },
                principalTable: "OrganizationRoles",
                principalColumns: new[] { "Id", "OrganizationId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserOrganizations_OrganizationRoles_CustomRoleId_Organizati~",
                table: "UserOrganizations");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "OrganizationRoles");

            migrationBuilder.DropIndex(
                name: "IX_UserOrganizations_CustomRoleId_OrganizationId",
                table: "UserOrganizations");

            migrationBuilder.DropColumn(
                name: "CustomRoleId",
                table: "UserOrganizations");
        }
    }
}
