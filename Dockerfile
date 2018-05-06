FROM ubuntu:16.04
RUN apt-get update --yes && apt-get upgrade --yes

RUN apt-get update --yes && apt-get upgrade --yes

RUN apt-get -y install curl

RUN apt-get -y install ffmpeg zlib1g-dev automake autoconf git \
                libtool subversion libatlas3-base python-pip \
                python-dev wget unzip cowsay \
                libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev \
                libpng-dev build-essential g++ vim

RUN apt-get clean

RUN curl https://nodejs.org/dist/v9.11.1/node-v9.11.1-linux-x64.tar.xz | tar xJf - -C /opt

ENV PATH="/opt/node-v9.11.1-linux-x64/bin:${PATH}"

RUN ln -s `which nodejs` /usr/bin/node

# Non-privileged user
RUN useradd -m dat

# Copy files
WORKDIR /home/dat
COPY components /home/dat/components
COPY lib /home/dat/lib
COPY server /home/dat/server
COPY static /home/dat/static
COPY stores /home/dat/stores
COPY views /home/dat/views
COPY package.json index.* /home/dat/
RUN chown -R dat. .

# Change npm permissions
RUN chown -R dat /opt/node-v9.11.1-linux-x64/lib/node_modules
RUN chown -R dat /opt/node-v9.11.1-linux-x64/bin
RUN chown -R dat /opt/node-v9.11.1-linux-x64/share

# Allow binding to ports 80 and 443 as a regular user
# https://github.com/beakerbrowser/dathttpd
RUN setcap cap_net_bind_service=+ep /opt/node-v9.11.1-linux-x64/bin/node

# Unprivileged
USER dat

RUN npm install

EXPOSE 5000

CMD ["node", "server/index"]

