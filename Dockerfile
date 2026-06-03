# Multi-stage build for the ASP.NET Core API (deploys to Cloud Run).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first (better layer caching).
COPY src/FraminghamRisk.Domain/FraminghamRisk.Domain.csproj src/FraminghamRisk.Domain/
COPY src/FraminghamRisk.Api/FraminghamRisk.Api.csproj src/FraminghamRisk.Api/
RUN dotnet restore src/FraminghamRisk.Api/FraminghamRisk.Api.csproj

# Build & publish.
COPY src/ src/
RUN dotnet publish src/FraminghamRisk.Api/FraminghamRisk.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./
# Cloud Run sends traffic to port 8080 by default.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "FraminghamRisk.Api.dll"]
