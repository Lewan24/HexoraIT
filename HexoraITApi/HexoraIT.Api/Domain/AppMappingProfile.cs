using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain;

using AutoMapper;

// TODO: Change AutoMapper to custom one or any free solution
public class AppMappingProfile : Profile
{
    public AppMappingProfile()
    {
        CreateMap<Organization, OrganizationDto>();
        CreateMap<CreateOrganizationDto, Organization>();
        CreateMap<UpdateOrganizationDto, Organization>();

        CreateMap<Asset, AssetDto>();
        CreateMap<CreateAssetDto, Asset>();
        CreateMap<UpdateAssetDto, Asset>();

        CreateMap<PasswordEntry, PasswordListDto>();
        CreateMap<CreatePasswordDto, PasswordEntry>()
            .ForMember(d => d.EncryptedPassword, o => o.Ignore());
        CreateMap<UpdatePasswordDto, PasswordEntry>()
            .ForMember(d => d.EncryptedPassword, o => o.Ignore());

        CreateMap<IPEntry, IPEntryDto>();
        CreateMap<CreateIPEntryDto, IPEntry>();
        CreateMap<UpdateIPEntryDto, IPEntry>();
        CreateMap<Subnet, SubnetDto>();
        CreateMap<CreateSubnetDto, Subnet>();
        CreateMap<UpdateSubnetDto, Subnet>();

        CreateMap<License, LicenseDto>();
        CreateMap<CreateLicenseDto, License>();
        CreateMap<UpdateLicenseDto, License>();

        CreateMap<Contact, ContactDto>();
        CreateMap<CreateContactDto, Contact>();
        CreateMap<UpdateContactDto, Contact>();

        CreateMap<Contract, ContractDto>()
            .ConstructUsing(src => new ContractDto(
                src.Id,
                src.Name,
                src.Vendor,
                src.Category,
                src.StartDate,
                src.EndDate,
                src.Value,
                src.Currency,
                src.AutoRenew,
                src.Notes,
                src.Starred,
                src.Status,
                src.DocumentName == null
                    ? null
                    : new ContractDocumentDto(
                        src.DocumentName,
                        src.DocumentMimeType ?? "",
                        src.DocumentSize ?? 0
                    )
            ));
        CreateMap<CreateContractDto, Contract>();
        CreateMap<UpdateContractDto, Contract>();

        CreateMap<Plan, PlanDto>();
        CreateMap<CreatePlanDto, Plan>();
        CreateMap<UpdatePlanDto, Plan>();

        CreateMap<Incident, IncidentDto>();
        CreateMap<CreateIncidentDto, Incident>();
        CreateMap<UpdateIncidentDto, Incident>();

        CreateMap<KnowledgeArticle, KnowledgeArticleDto>();
        CreateMap<CreateKnowledgeArticleDto, KnowledgeArticle>();
        CreateMap<UpdateKnowledgeArticleDto, KnowledgeArticle>();

        CreateMap<Project, ProjectDto>()
            .ForCtorParam(nameof(ProjectDto.TaskCount),
                opt => opt.MapFrom(src => src.Tasks.Count));

        CreateMap<CreateProjectDto, Project>();
        CreateMap<UpdateProjectDto, Project>();
        
        CreateMap<WorkTask, WorkTaskDto>();
        CreateMap<CreateWorkTaskDto, WorkTask>();
        CreateMap<UpdateWorkTaskDto, WorkTask>();

        CreateMap<Group, GroupDto>();
        CreateMap<CreateGroupDto, Group>();
        CreateMap<UpdateGroupDto, Group>();

        CreateMap<WarrantyItem, WarrantyItemDto>()
            .ConstructUsing(src => new WarrantyItemDto(
                src.Id,
                src.Name,
                src.Vendor,
                src.SerialNumber,
                src.PurchaseDate,
                src.WarrantyEndDate,
                src.WarrantyType,
                src.ContactName,
                src.ContactPhone,
                src.ContactEmail,
                src.Notes,
                src.AssetId,
                src.Starred,
                src.Status,
                src.DocumentName == null
                    ? null
                    : new WarrantyDocumentDto(
                        src.DocumentName,
                        src.DocumentMimeType ?? "",
                        src.DocumentSize ?? 0
                    )
            ));
        CreateMap<CreateWarrantyItemDto, WarrantyItem>();
        CreateMap<UpdateWarrantyItemDto, WarrantyItem>();

        CreateMap<DiagramNode, DiagramNodeDto>();
        CreateMap<DiagramNodeDto, DiagramNode>();

        CreateMap<DiagramEdge, DiagramEdgeDto>()
            .ConstructUsing(s => new DiagramEdgeDto(s.Id, s.SourceNodeId, s.TargetNodeId, s.Label, s.ConnectionType));

        CreateMap<DiagramEdgeDto, DiagramEdge>()
            .ConstructUsing(s => new DiagramEdge
            {
                Id = s.Id,
                SourceNodeId = s.Source,
                TargetNodeId = s.Target,
                Label = s.Label,
                ConnectionType = s.ConnectionType,
            });
    }
}