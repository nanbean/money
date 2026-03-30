# 서버 배포 가이드

## 새 서버 초기 설정

### 1. Node.js 설치 (nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 22
nvm use 22
nvm alias default 22
```

### 2. PM2 설치

```bash
npm install -g pm2
```

### 3. 저장소 클론

```bash
git clone <repo-url> ~/money
cd ~/money
npm install
```

### 4. 환경변수 파일 생성

`.env.production`은 git에 포함되지 않으므로 직접 생성합니다.

```bash
cp .env .env.production  # 또는 직접 생성
vi ~/money/.env.production
```

필수 항목:
```
REACT_APP_COUCHDB_URL=couchdb.nanbean.net
REACT_APP_COUCHDB_ADMIN_ID=admin
REACT_APP_COUCHDB_ADMIN_PW=...
REACT_APP_COUCHDB_ADMIN_ID=...
# 기타 항목은 기존 서버의 .env.production 참고
```

### 5. ecosystem.config.js 수정

새 서버의 Node.js 경로로 업데이트합니다.

```bash
# 현재 서버의 node 경로 확인
which node
# 예: /home/ubuntu/.nvm/versions/node/v22.16.0/bin/node
```

`ecosystem.config.js`에서 아래 두 항목을 실제 경로에 맞게 수정합니다:

```js
interpreter: '/home/ubuntu/.nvm/versions/node/v22.16.0/bin/node',  // node 경로
cwd: '/home/ubuntu/money',                                           // 클론 경로
```

### 6. 프론트엔드 빌드

```bash
npm run build
```

### 7. PM2 시작

```bash
cd ~/money
pm2 start ecosystem.config.js
pm2 save
```

### 8. 서버 재부팅 시 PM2 자동 시작 설정

```bash
pm2 startup
# 출력된 명령어를 복사해서 실행 (sudo 포함)
pm2 save
```