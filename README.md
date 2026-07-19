# HINANA STUDIO

HINANA STUDIO는 React, TypeScript, Electron, FFmpeg로 개발 중인 크로스 플랫폼 데스크톱 영상 편집기입니다.

현재 버전은 **Ver. 1.0.0 Beta 1**입니다. Windows x64와 Apple Silicon macOS에서 개발·테스트하고 있으며, 아직 정식 배포판이 아닙니다.

## 주요 기능

- 이미지, 영상, 음원 드래그 앤 드롭 및 미디어 보관함
- 영상·이미지·자막·오디오 다중 트랙 타임라인
- 클립 이동, 길이 조절, 분할, 삭제 및 동적 레이어 추가·제거
- 미리보기 재생, 탐색, 오디오 파형, 볼륨 및 페이드 인·아웃
- 이미지·영상 위치, 크기, 회전, 투명도 및 화면 맞춤
- 자르기, 사각형·타원 마스크, 전체·부분 모자이크와 블러
- 레이어 맨 앞으로·맨 뒤로 보내기
- 자막 위치·폭·글꼴·색상·배경·테두리·그림자 편집
- 직선 프리셋, 구간 지정 및 자유 경로 이미지 모션
- 실행 취소·다시 실행과 자동 복구 저장
- 해상도, FPS 및 내보내기 품질 설정
- FFmpeg 기반 MP4(H.264/AAC) 내보내기와 하드웨어 인코더 자동 선택
- 미디어를 포함하는 단일 `.hinana` 휴대용 프로젝트 패키지

## 개발 실행

Node.js와 npm이 필요합니다. 저장소를 받은 뒤 운영체제에서 직접 의존성을 설치하세요. 다른 OS에서 생성한 `node_modules`를 복사하면 안 됩니다.

```bash
npm ci
npm run dev
```

일반 빌드 검사는 다음 명령으로 실행합니다.

```bash
npm run build
```

## Windows x64 빌드

Windows에서 실행하세요.

```powershell
git pull
npm ci
npm run dist:win
```

결과:

```text
release/HINANA-STUDIO-1.0.0-beta.1-x64.exe
```

## Apple Silicon macOS 빌드

Apple Silicon Mac에서 실행하세요.

```bash
git pull
npm ci
npm run dist:mac
```

결과:

```text
release/HINANA-STUDIO-1.0.0-beta.1-arm64.dmg
release/HINANA-STUDIO-1.0.0-beta.1-arm64.zip
```

의존성이나 Electron·FFmpeg 환경이 꼬인 경우에만 완전히 다시 설치합니다.

```bash
rm -rf node_modules
npm ci
npm run dist:mac
```

## 프로젝트 파일

새로 저장되는 `.hinana` 파일은 편집 정보와 사용한 이미지·영상·음원을 함께 보관하는 단일 패키지입니다. 따라서 파일 하나를 Windows와 macOS 사이에 옮겨 열 수 있습니다.

패키지 포맷에는 다음 정보가 포함됩니다.

- `formatVersion`
- `project.json`
- `assets/`
- 원본 파일명, 미디어 종류와 크기
- HINANA STUDIO 앱 버전
- 향후 썸네일 확장을 위한 메타데이터

기존 JSON 방식과 패키지 포맷 1의 `.hinana` 파일도 계속 열 수 있습니다. 미디어를 포함하므로 프로젝트 파일 크기는 원본 미디어 전체 용량과 비슷할 수 있습니다.

## 배포 시 주의사항

- 현재 Windows 설치 파일에는 코드 서명 인증서가 없어 SmartScreen 경고가 나타날 수 있습니다.
- 현재 macOS 앱은 Developer ID 서명과 Apple 공증이 없어 Gatekeeper 경고가 나타날 수 있습니다.
- macOS Intel(x64) 배포판은 아직 빌드 대상에 포함하지 않았습니다.
- `dist/`와 `release/`는 생성 결과물이므로 Git 저장소에 포함하지 않습니다.

## 개발/제작

비나래 · [GitHub](https://github.com/murikubo)

## 라이선스

Copyright © 2026 비나래. All rights reserved.

HINANA STUDIO는 오픈소스 소프트웨어가 아닙니다. 공식 바이너리는 무료로 사용할 수 있고 공식 앱으로 만든 결과물의 권리는 사용자에게 있습니다. 다만 소스 코드의 수정·재배포·리브랜딩, 바이너리 재배포 또는 별도 서비스 제공 권한은 부여되지 않습니다. 자세한 내용은 [LICENSE](LICENSE)를 확인하세요.
