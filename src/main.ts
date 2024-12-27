/**
 * 엔트리 파일
 * 
 * 세 가지 처리 지점을 처리합니다:
 * - 코드 블록 "ab" (코드 블록)
 * - cm (실시간 모드)
 * - 렌더링 후 처리 (렌더링/읽기 모드)
 */

import { Plugin } from "obsidian"
import { MarkdownRenderChild, MarkdownRenderer } from 'obsidian'

// 변환기 모듈
import { ABConvertManager } from "src/ABConverter/index"

import { ABReplacer_CodeBlock } from "./ab_manager/abm_code/ABReplacer_CodeBlock"
import { ABStateManager } from "./ab_manager/abm_cm/ABStateManager"
import { ABSelector_PostHtml } from "./ab_manager/abm_html/ABSelector_PostHtml"
import type { ABSettingInterface } from "./config/ABSettingTab"
import { ABSettingTab, AB_SETTINGS } from "./config/ABSettingTab"
import { ABCSetting } from "./ABConverter/ABReg"


export default class AnyBlockPlugin extends Plugin {
  settings: ABSettingInterface

	async onload() {
    await this.loadSettings();
    this.addSettingTab(new ABSettingTab(this.app, this));

    // Obsidian의 렌더링 동작을 콜백 함수에 전달합니다 (목적은 변환기와 Obsidian을 분리하는 것입니다)
    ABConvertManager.getInstance().redefine_renderMarkdown((markdown: string, el: HTMLElement, ctx?: any): void => {
      el.classList.add("markdown-rendered")

      /*
       * Renders markdown string to an HTML element.
       * @deprecated - use {@link MarkdownRenderer.render}
       * 
       * 원래 정의: 
       * @param markdown - The markdown source code
       * @param el - The element to append to
       * @param sourcePath - The normalized path of this markdown file, used to resolve relative internal links
       *     이 마크다운 파일의 정규화된 경로로, 상대 내부 링크를 해결하는 데 사용됩니다
       *     TODO 이미지 재렌더링 시 버그가 발생하는 이유를 알 것 같습니다. 원인은 여기일 것입니다
       * @param component - A parent component to manage the lifecycle of the rendered child components, if any
       *     렌더링된 자식 컴포넌트(있는 경우)의 수명 주기를 관리하는 부모 컴포넌트
       * @public
       * 
       */
      //MarkdownRenderer.renderMarkdown(markdown, el, app.workspace.activeLeaf?.view?.file?.path??"", new MarkdownRenderChild(el))

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
      // @ts-ignore 새 인터페이스, 하지만 구 인터페이스는 지원하지 않는 것 같습니다
      MarkdownRenderer.render(app, markdown, el, app.workspace.activeLeaf?.view?.file?.path??"", mdrc)
    })

    // 훅 그룹 1 - 코드 블록
    this.registerMarkdownCodeBlockProcessor("ab", ABReplacer_CodeBlock.processor);
    this.registerMarkdownCodeBlockProcessor("anyblock", ABReplacer_CodeBlock.processor);
    
    // 훅 그룹 2 - 비렌더링 모드 cm 확장 - StateField
    {
      let abm: ABStateManager|null
      // 플러그인이 처음 시작될 때 트리거
      this.app.workspace.onLayoutReady(()=>{
        abm?.destructor();
        abm = new ABStateManager(this)
      })
      // 새 파일을 열거나 두 개의 다른 열린 파일 탭 사이를 전환할 때 트리거
      this.registerEvent(
        this.app.workspace.on('file-open', (fileObj) => {
          abm?.destructor();
          abm = new ABStateManager(this)
        })
      )
      // 새 파일을 열거나 포커스 레이아웃을 전환할 때 트리거. Obsidian V1.5.8로 인해 발생한 버그를 수정합니다. 이전 버전에서는 필요하지 않았습니다
      this.registerEvent(
        this.app.workspace.on('layout-change', () => {
          abm?.destructor();
          abm = new ABStateManager(this)
        })
      )
    }

    // 훅 그룹 3 - 렌더링 모드 후처리기
    const htmlProcessor = ABSelector_PostHtml.processor.bind(this)
    this.registerMarkdownPostProcessor(htmlProcessor);
  }

  async loadSettings() {
    const data = await this.loadData() // 설정 파일이 없으면 null
		this.settings = Object.assign({}, AB_SETTINGS, data); // 기본값과 설정 파일의 값을 병합

    // 설정 파일이 없으면 기본값의 설정 파일을 생성
    if (!data) {
      this.saveData(this.settings);
    }
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}

  onunload() {
  }
}
