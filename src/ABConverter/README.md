# Any Block Converter

## 사용

### 사용 프로세스

```typescript
// 변환기 모듈
import { ABConvertManager } from "ABConvertManager"
// 모든 변환기 로드 (모두 선택 사항)
// (물론, A 변환기가 B 변환기에 의존하는 경우, A를 가져오면 B도 가져와야 합니다)
import {} from "./ABConverter/converter/abc_text"
import {} from "./ABConverter/converter/abc_list"
import {} from "./ABConverter/converter/abc_table"
import {} from "./ABConverter/converter/abc_deco"
import {} from "./ABConverter/converter/abc_ex"
import {} from "./ABConverter/converter/abc_mermaid" // 선택 사항 권장: 7.1MB
import {} from "./ABConverter/converter/abc_markmap" // 선택 사항 권장: 1.3MB

// 먼저 기본 렌더링 동작을 등록합니다.
ABConvertManager.getInstance().redefine_renderMarkdown((markdown: string, el: HTMLElement): void => {...})

// 그런 다음 아래의 프로토타입을 사용하여 정상적으로 사용하면 됩니다.
ABConvertManager.autoABConvert(el:HTMLDivElement, header:string, content:string): HTMLElement
```

### Obsidian 콜백 함수 설정

```typescript
ABConvertManager.getInstance().redefine_renderMarkdown((markdown: string, el: HTMLElement, ctx?: any): void => {
    /**
     * Renders markdown string to an HTML element.
     * @deprecated - use {@link MarkdownRenderer.render}
     * 
     * 원래 정의: 
     * @param markdown - The markdown source code
     * @param el - The element to append to
     * @param sourcePath - The normalized path of this markdown file, used to resolve relative internal links
     *     이 마크다운 파일의 정규화된 경로로, 상대 내부 링크를 해결하는 데 사용됩니다.
     *     TODO 아마도 이미지 재렌더링에 버그가 발생하는 이유를 여기서 찾을 수 있을 것 같습니다.
     * @param component - A parent component to manage the lifecycle of the rendered child components, if any
     *     렌더링된 자식 컴포넌트(있는 경우)의 수명 주기를 관리하는 부모 컴포넌트
     * @public
     * 
     */
    //MarkdownRenderer.renderMarkdown(markdown, el, "", new MarkdownRenderChild(el))

    const mdrc: MarkdownRenderChild = new MarkdownRenderChild(el);
    if (ctx) ctx.addChild(mdrc);
    else if (ABCSetting.global_ctx) ABCSetting.global_ctx.addChild(mdrc);
    /**
     * Renders markdown string to an HTML element.
     * @param app - A reference to the app object
     * @param markdown - The markdown source code
     * @param el - The element to append to
     * @param sourcePath - The normalized path of this markdown file, used to resolve relative internal links
     * @param component - A parent component to manage the lifecycle of the rendered child components.
     * @public
     */
    // @ts-ignore 新接口，但旧接口似乎不支持
    MarkdownRenderer.render(app, markdown, el, app.workspace.activeLeaf?.view?.file?.path??"", mdrc)
})
```

### MarkdownIt 콜백 함수 설정

```typescript
ABConvertManager.getInstance().redefine_renderMarkdown((markdown: string, el: HTMLElement): void => {
    const result: string = md.render(markdown)
    const el_child = document.createElement("div"); el.appendChild(el_child); el_child.innerHTML = result;
})
```

## 개발/설계/아키텍처 보충

（먼저 src 하위의 README를 읽으세요）

### 아키텍처

또한 Any Block Render (text->html 시)

모듈화로 인해 많은 Converter (text->text 등)가 내장되어 있으므로 전체적으로 Any Block Converter라고 부릅니다.

### 이 모듈 설계는 Ob 플러그인에 의존하지 않아야 합니다.

**이 모듈은 이전에 Ob 플러그인 인터페이스에 의존했었습니다**, 나중에 재사용 가능한 AnyBlock 변환기로 변경되었습니다.

높은 재사용성을 위해 (Ob 플러그인에서만 사용하는 것이 아니라 md-it 등 다른 곳에서도 사용하기 위해)

1. 선택기와의 결합을 해제해야 합니다.
2. V2 버전과 비교하여, Ob의 하위 계층에 의존하지 않기 위해 `MarkdownRenderer` 관련 함수를 대체하는 콜백 함수를 사용합니다.

### 프로그램 약어

- `AnyBlock`：`AB`
- `AnyBlockConvert`：`ABC`
- `AnyBlockSelector`：`ABS`
- `AnyBlockRender`：`ABR`

### 형식 변환 위치

> ##### 생각

예를 들어 두 가지 형식이 있습니다: 형식1 (형식1 해석 렌더링, 자신의 형식을 다른 형식으로 변환, 다른 형식을 자신의 형식으로 변환), 형식2 (형식2 해석 렌더링, 다른 형식을 자신의 형식으로 변환, 자신의 형식을 다른 형식으로 변환). 문제는: 1에서 2로의 변환과 2에서 1로의 변환 기능을 어떻게 설정해야 할까요?

1. 두 파일에 모두 넣기
    - 장점: 두 모듈이 서로 독립적입니다.
    - 단점: 중복을 초래하며, 재사용이 아닙니다. — 한 번만 작성하고 두 프로그램이 하나의 버전을 사용합니다.
2. 형식2에만 넣기
    - 생각: 이 방법은 형식1이 먼저 존재하고 형식2가 확장된 것으로 간주합니다. 또는 형식1이 더 일반적이고 광범위한 형식으로 간주되며, 형식2는 확장 형식으로, 자연스럽게 형식2가 1과 2의 상호 변환을 담당합니다.
    - 채택: abc_mermaid, abc_markmap과 list의 변환은 이 유형에 속하며, 후속 추가되는 새로운 형식도 이 유형에 속합니다.
3. 1에서 2로의 변환은 2가 구현하고, 2에서 1로의 변환은 1이 구현합니다.
    - 생각: 이 방법은 1과 2가 두 개의 상업 소프트웨어로 간주되며, 그들은 상대방의 사용자가 자신 쪽으로 이동하는 것을 기꺼이 허용하지만, 자신의 사용자가 상대방 쪽으로 이동하는 것을 기꺼이 허용하지 않습니다.
    - 채택: list와 table의 상호 변환은 이 유형에 속합니다.

> ##### 요약

형식의 일반성에 따라 분류: (위로 갈수록 일반 수준이 높아집니다)

1. str
2. html
3. list, table
4. mermaid, mindmap, …… 이후의 확장

> ##### 전략

1. 낮은 일반성 형식은 높은 일반성 형식과의 상호 변환을 구현해야 합니다.
2. 동일한 일반성 수준에서는 다른 동일한 일반성 형식이 자신의 형식으로 변환하는 것을 구현해야 합니다.

## todo

1. 별칭 모듈, AnyBlockConverter는 최종적으로 html을 강제로 출력해서는 안 됩니다. 마지막에 md를 보충하는 행동은 ob의 별칭 모듈이 하는 것이며, abc가 해서는 안 됩니다.
2. PlantUML, 많은 것들이 더 유용해 보입니다.

## bug

### mdit 환경에서 onclick이 내장되어야만 작동

```typescript
// TODO, onClick 코드가 mdit 환경에서 버튼 클릭이 작동하지 않습니다. 테스트 코드는 다음과 같습니다.
const btn = document.createElement("button"); table.appendChild(btn); btn.textContent = "테스트 버튼1";
btn.onclick = () => { console.log("btn.onclick") }
const btndiv = document.createElement("div"); table.appendChild(btndiv);
btndiv.innerHTML = `<button onclick="console.log('Button was clicked!')">테스트 버튼2</button>`
// mdit 환경에서 버튼1이 정상적으로 작동하지 않고, 버튼2는 작동하는 것을 발견했습니다.
// 원인은: mdit 환경의 document 객체가 jdsom에 의해 생성된 가짜이기 때문입니다. 이 dom 객체는 나중에 html_str로 변환되며, onclick 정보가 손실됩니다.
```

### mermaid에서 DOMPurify를 찾을 수 없음

mermaid의 정의되지 않은 동작 오류 (하지만 이 문제를 해결한 후 BBox를 찾을 수 없다고 합니다)

```typescript
// 참조: https://github.com/kkomelin/isomorphic-dompurify

// 사용
import DOMPurify from "isomorphic-dompurify"
// 대체
import DOMPurify from "dompurify"
```
