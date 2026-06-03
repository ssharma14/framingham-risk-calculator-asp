using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FraminghamRisk.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assessments_CreatedAt",
                table: "Assessments");

            migrationBuilder.AddColumn<string>(
                name: "SessionId",
                table: "Assessments",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_SessionId_CreatedAt",
                table: "Assessments",
                columns: new[] { "SessionId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assessments_SessionId_CreatedAt",
                table: "Assessments");

            migrationBuilder.DropColumn(
                name: "SessionId",
                table: "Assessments");

            migrationBuilder.CreateIndex(
                name: "IX_Assessments_CreatedAt",
                table: "Assessments",
                column: "CreatedAt");
        }
    }
}
