# README

해당 repository는 [https://github.com/any-block/obsidian-any-block](https://github.com/any-block/obsidian-any-block)에서 fork 하였습니다.  
중문과 영문만 지원하여 번역기를 통해 한글을 출력할 수 있게 하였습니다.  
코드적으로 수정된 부분은 없으며 오로지 번역만 진행하였습니다.


## 개발시 필요 절차
```bash
# 설치
yarn install
# 실행
yarn dev
# yarn build를 위한 필수 의존 설치
npm install --save-dev @types/plantuml-encoder
yarn add mermaid @mermaid-js/mermaid-mindmap markmap-lib plantuml-encoder markmap-common --dev
# 배포
yarn build
```


## Lightspot (亮点)

![Obsidian plugin](https://img.shields.io/endpoint?url=https%3A%2F%2Fscambier.xyz%2Fobsidian-endpoints%2Fany-block.json) ![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/LincZero/obsidian-any-block)

A Obsidian Plugin. You can flexibility to create a 'Block' by some means. It also provides some useful features, like `list to table`.

오브시디언 플러그인입니다. 특정 방법으로 '블록'을 유연하게 생성할 수 있습니다. 또한 `목록을 표로`와 같은 유용한 기능을 제공합니다.

This is a **【Syntax free, Extensible、Powerful and flexible、Multi-platform】** Markdown block extension rendering plugin

（이것은 **【무문법, 확장 가능, 강력하고 유연한, 다중 플랫폼】** Markdown 블록 확장 렌더링 플러그인입니다）

- Syntax free (무문법)
    - No new syntax、Syntax-free intrusion (새로운 문법 없음, 문법 침입 없음)
	- 이것은 또한 과도한 플러그인 의존성을 초래하지 않습니다. 좋은 플러그인은 사용 후 원래 콘텐츠가 변형되거나 읽기 어렵거나 유지 관리가 불가능해지지 않아야 한다고 생각합니다.
- Extensible (확장 가능성)
    - Facilitate secondary development （플러그인은 2차 개발을 용이하게 합니다）
- Powerful and flexible (유연하고 강력함)
    - 선택기: 선택 범위가 유연하며, 여섯 가지 방법으로 간단하고 쉽게 사용할 수 있습니다.
	- 프로세서: 다양하고 강력하며 확장성이 뛰어납니다.
- Multi-platform (다중 플랫폼)
    - Obsidian
	- markdown-it 파싱을 지원하는 vuepress/vitepress와 같은 블로그
	- V3 버전은 markdown-it 플러그인으로 재구성 및 마이그레이션되어 Obsidian과 VuePress/VitePress에 게시한 내용이 높은 일관성을 유지할 수 있습니다. (VuePress에서의 효과는 위의 첫 번째 링크를 클릭하여 확인할 수 있습니다.)

## Multi-Language (다국어)

- en
	- Language issues: Documentation is multilingual (zh/en), don't worry
	- Alternate site links：When the website link to this article fails, try replacing `linczero.github.io` with `linczero-github-io.pages.dev` in the url
- zh
	- 언어 문제: 문서는 다국어(zh/en)로 제공되므로 걱정하지 마세요.
	- 대체 사이트 링크: 웹사이트 링크가 실패할 경우, URL에서 `linczero.github.io`를 `linczero-github-io.pages.dev`로 바꿔보세요.
	  （**이 문서의 기본 웹사이트 링크는 github.io를 가리키며, 국내에서 접근이 불가능한 경우 이 단계를 수행해야 할 가능성이 높습니다.**）

## Docs、More Links (관련 링크)

- en
	- Related links：tutorial、use skill、contribution、secondary development
	- [Online Wiki - github.io](https://linczero.github.io/MdNote_Public/ProductDoc/AnyBlock/)
	- [Online Effects warrior - github.io](https://linczero.github.io/MdNote_Public/ProductDoc/AnyBlock/README.show.md)
- zh
	- 관련 링크: 튜토리얼, 사용 기술, 기여, 2차 개발
	- [온라인 문서 - github.io](https://linczero.github.io/MdNote_Public/ProductDoc/AnyBlock/)
	- [온라인 효과 전시 - github.io](https://linczero.github.io/MdNote_Public/ProductDoc/AnyBlock/README.show.md)

## Effects warrior (효과 전시)

`multiWay table`/`multiCross table`/`Cross table` (`다중 교차 표`/`교차 표`)

![](./docs/zh/png/Pasted%20image%2020240808202548.png)

![](./docs/zh/png/Pasted%20image%2020240808203055.png)

`ListTable`/`TreeTable`/`TreeGrid` (`목록 표`/`트리형 표`)

![](./docs/zh/png/Pasted%20image%2020240808203143.png)

Optimized list (최적화된 목록)

본질은 "목록 표"에 기반하여 모의 목록 스타일을 추가한 것입니다. (본질은 "목록 표"의 기초 위에 모의 목록 스타일을 추가한 것입니다.)

![](./docs/zh/png/listtable_likelist.png)

Dir Tree (디렉토리 트리)

본질은 "목록 표"에 기반하여 모의 디렉토리 스타일을 추가한 것입니다. (본질은 "목록 표"의 기초 위에 모의 디렉토리 스타일을 추가한 것입니다.)

![](./docs/zh/png/Pasted%20image%2020240808203216.png)

ASCII Dir Tree (ASCII 디렉토리 트리) 

![](./docs/zh/png/Pasted%20image%2020240808203232.png)

  WBS (작업 분해 구조, Work Breakdown Structure)

![](./docs/zh/png/Pasted%20image%2020240808203252.png)

timeline (타임라인)

![](./docs/zh/png/Pasted%20image%2020240808203455.png)

tabs & card (탭 및 카드)

![](./docs/zh/png/tag%20and%20card.png)

mermaid flow (mermaid 흐름도)

![](./docs/zh/png/Pasted%20image%2020240808203517.png)

plantuml mindmap (plantuml 마인드맵)

![](./docs/zh/png/Pasted%20image%2020240808203534.png)

nodes (ab mindmap) (노드 트리, AnyBlock 버전 마인드맵)

![](./docs/zh/png/list2node.png)

markmap mindmap (markmap 마인드맵)

![](./docs/zh/png/Pasted%20image%2020240808203605.png)

mermaid mindmap (mermaid 마인드맵)

![](./docs/zh/png/Pasted%20image%2020240808203621.png)

[more……](https://linczero.github.io/MdNote_Public/%E4%BA%A7%E5%93%81%E6%96%87%E6%A1%A3/AnyBlock/)

## Effects warrior - old (이전 효과 전시)

Here are some of the more common processors:
- list2table  (2datatable)
- list2listtable
- list2mermaid  (graph LR)
- list2mindmap  (mermaid v9.3.0 mindmap)
- list2tab
- list2timeline
- title2list + list2somthing

![](./docs/zh/png/list2table.png)

![](./docs/zh/png/list2tableT.png)

![](./docs/zh/png/list2lt.gif)
 
![](./docs/zh/png/list2tab.gif)
 
![](./docs/zh/png/list2mermaid.png)

![](./docs/zh/png/list2mindmap.png)

![](./docs/zh/png/titleSelector.png)

![](./docs/zh/png/addTitle.png)

![](./docs/zh/png/scroll.gif)
 
![](./docs/zh/png/overfold.png)

![](./docs/zh/png/flod.gif)

![](./docs/zh/png/heimu.gif)

![](./docs/zh/png/userProcessor.png)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=LincZero/obsidian-any-block&type=Date)](https://star-history.com/#LincZero/obsidian-any-block&Date)
