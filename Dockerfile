# Container image that runs your code
FROM alpine:latest

# RUN apk add --no-cache \
#         bash \
#         wget \
#     && mkdir /target \
#     && cd /target \
#     && wget https://github.com/textileio/textile/releases/download/v0.0.2/textile_v0.0.2_linux-amd64.tar.gz \
#     && tar -xvf textile_v0.0.2_linux-amd64.tar.gz \
#     && chmod u+x textile

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]
