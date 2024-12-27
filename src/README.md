# 개발 README

## 컴파일 및 배포

### 컴파일

```bash
npm i
npm run build
```

### 사용

그런 다음 이 세 파일을 복사합니다:

- main.js
- manifest.json
- styles.css

로컬에서 사용하려면 .obsidian/플러그인명 폴더에 복사합니다.

Github Release에 배포할 때도 이 세 파일을 배포합니다.

### 커뮤니티에 배포 - 수동

1. 빌드 결과물을 Release에 업데이트합니다.
2. manifest.json과 package.json의 버전 번호를 업데이트하는 것을 잊지 마세요 (프로젝트에서 `"version": "3.1."`을 검색한 후 수정하세요, 누락되지 않도록).
    (배포할 때만 수정하고, GitHub Release에 내용이 있는지 확인해야 합니다. 평소에는 수정하지 마세요, Ob 커뮤니티 저장소가 자동으로 변경 사항을 감지하고 업데이트할 수 있습니다.)
3. GitHub에 업데이트하고, 코드 푸시 업데이트를 합니다.
4. 더 이상 Obsidian 커뮤니티의 저장소에서 그 json의 버전 번호를 업데이트할 필요가 없습니다 (manifest.json을 수정하면 그쪽에서 자동으로 업데이트됩니다).

### 커뮤니티에 배포 - Github Action 자동

참고: [Using GitHub actions to release plugins](https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877)

## 프로그램 설계

이 부분의 더 많은 내용은 공개 md 노트에 작성할 예정이며, 공식 웹사이트를 참조하세요.

### 변환기 및 선택기 모듈

전체 Ob 플러그인의 핵심은 두 부분으로 나뉩니다:

- 메인 플러그인, `AnyBlock`, 코드 약어 `AB`
    - 변환기, `AnyBlockConvert`, 코드 약어 `ABC`
        - 사용법: txt를 html로 변환
        - 특징: 범용, 확장 가능
        - 카테고리: 다양한 변환기를 동적으로 등록할 수 있음 (2mermaid, 2lt, 2mindmap 등)
    - 관리자, `AnyBlockManager`, 코드 약어 `ABM`
        - 사용법: 교체기와 선택기가 함께 있기 때문에 여기서 합쳐졌습니다.
        - 카테고리
            - Obsidian에서, 이는 Ob의 세 가지 선택기를 지원합니다:
                - 코드 블록 선택기, 코드 약어 `ABS_CodeBlock` (내장 선택기)
                - CM 선택기, 코드 약어 `ABS_CM`
                - 후 선택기, 코드 약어 `ABS_Html`
            - VuePress에서, 이는 다양한 선택기를 지원합니다:
                - Markdown-it의 TokensStream
                - `:::` 선택기 (markdown-it-container)
            - 기타 TokensStream 또는 AST 구조의 소프트웨어
        - 추가 포함
            - 선택기 `AnyBlockSelector`, 코드 약어 `ABS`
                - 사용법: 범위를 선택하고 범위 값을 반환
                - 특징: 범용 정의, 비범용 구현, 확장 가능
                - 카테고리: 다양한 선택기를 동적으로 등록할 수 있음 (list, table, quote, codeblock 등, 그 중 codeblock 선택기는 일반적으로 내장되어 있음)
            - 교체기, `AnyBlockReplacer`, 코드 약어 `ABR`
                - 사용법: 선택기가 범위를 선택한 후, 교체기가 이 범위의 내용을 변환기에 전달하고 변환된 결과로 원래 내용을 대체
                - 특징: 비범용, 확장 불가
            
각 **영역**은 **교체기**와 **선택기**를 각각 구현해야 합니다. 즉, 구현 수는 그들의 곱입니다.

(참고: CodeBlock은 일반적으로 내장 선택기를 가지고 있으며, 일반적으로 다시 선택할 필요가 없습니다. AnyBlock이 중첩된 경우를 제외하고)
