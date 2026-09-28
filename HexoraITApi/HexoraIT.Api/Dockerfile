FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
RUN mkdir -p /app/storage /app/data-protection-keys /app/App_Data/storage/files /app/App_Data/storage/data-protection-keys \
    && chown -R "$APP_UID:$APP_UID" /app/storage /app/data-protection-keys /app/App_Data
USER $APP_UID
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["HexoraITApi.csproj", "./"]
RUN dotnet restore "HexoraITApi.csproj"
COPY . .
WORKDIR "/src/"
RUN dotnet build "./HexoraITApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./HexoraITApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "HexoraITApi.dll"]
