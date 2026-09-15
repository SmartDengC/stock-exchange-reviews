FROM node:22-slim AS builder

ARG NPM_REGISTRY=https://registry.npmjs.org/

# --max-old-space-size
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS=--max-old-space-size=8192
ENV TZ=Asia/Shanghai
ENV CI=true

RUN npm i -g corepack

WORKDIR /app

# copy package.json and pnpm-lock.yaml to workspace
COPY . /app

# 安装依赖
RUN pnpm config set registry "$NPM_REGISTRY" \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-factor 2 \
    && pnpm config set fetch-retry-mintimeout 10000 \
    && pnpm config set fetch-retry-maxtimeout 120000 \
    && pnpm config set fetch-timeout 300000 \
    && pnpm config set network-concurrency 4 \
    && pnpm install --frozen-lockfile
RUN pnpm run build

RUN echo "Builder Success 🎉"

FROM nginx:stable-alpine AS production

ARG BACKEND_API_HOST=hahadeng.cn
ARG SINA_RELAY_ALLOW_IP=127.0.0.1
ARG SINA_RELAY_PORT=8091

# 配置 nginx
RUN echo "types { application/javascript js mjs; }" > /etc/nginx/conf.d/mjs.conf \
    && rm -rf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/apps/web-antd/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY --from=builder /app/scripts/deploy/nginx.conf /etc/nginx/nginx.conf
RUN test -n "$BACKEND_API_HOST" \
    && test -n "$SINA_RELAY_ALLOW_IP" \
    && test -n "$SINA_RELAY_PORT" \
    && sed -i "s/__BACKEND_API_HOST__/${BACKEND_API_HOST}/g; s/__SINA_RELAY_ALLOW_IP__/${SINA_RELAY_ALLOW_IP}/g" /etc/nginx/nginx.conf

EXPOSE 8080 8081

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
