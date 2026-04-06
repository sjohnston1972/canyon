FROM alpine:latest

ARG PB_VERSION=0.25.9

RUN apk add --no-cache unzip ca-certificates wget

# Download PocketBase
RUN wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip \
    && unzip /tmp/pb.zip -d /pb/ \
    && rm /tmp/pb.zip \
    && chmod +x /pb/pocketbase

# Create data directory
RUN mkdir -p /pb/pb_data /pb/pb_migrations /pb/pb_hooks

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
