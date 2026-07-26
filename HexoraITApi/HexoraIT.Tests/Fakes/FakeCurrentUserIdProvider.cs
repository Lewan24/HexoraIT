using HexoraITApi.Infrastructure;

namespace HexoraIT.Tests.Fakes;

public class FakeCurrentUserIdProvider : ICurrentUserIdProvider
{
    public Guid? UserId { get; set; }
}