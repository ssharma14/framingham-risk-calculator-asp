using Microsoft.EntityFrameworkCore;

namespace FraminghamRisk.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Assessment> Assessments => Set<Assessment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var assessment = modelBuilder.Entity<Assessment>();

        // Store enums as readable text in the DB rather than opaque integers.
        assessment.Property(a => a.Sex).HasConversion<string>();
        assessment.Property(a => a.Level).HasConversion<string>();

        // History is queried per-session, newest-first; index that access pattern.
        assessment.HasIndex(a => new { a.SessionId, a.CreatedAt });
    }
}
