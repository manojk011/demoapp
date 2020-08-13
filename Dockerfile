
#FROM docker-baseimages-local.devopsrepo.kp.org/rhel-ubi:8.1.328
FROM docker-baseimages-local.devopsrepo.kp.org/node:10.19.0
LABEL baseimage='rhel8'
#RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash -
#RUN yum install -y gcc-c++ make

#RUN yum install -y nodejs
RUN rm -rf /etc/pki/consumer/key*
RUN rm -rf /etc/pki/entitlement/*key.pem
RUN useradd -u 8877 appuser
USER appuser

COPY . .
RUN rm -rf .npmrc

ENV PORT=6666
ENV local_config_path=/usr/app/secrets.json
ENTRYPOINT npm start
#CMD [ "npm", "start" ]  
LABEL namespace="kp-digital-aks-azdash-dev"
