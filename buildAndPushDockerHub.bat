docker build -t lewan24/hexorait-api:latest ./HexoraITApi/HexoraIT.Api --no-cache
docker build -t lewan24/hexorait-web:latest ./HexoraITWeb --no-cache

docker push lewan24/hexorait-api:latest
docker push lewan24/hexorait-web:latest
