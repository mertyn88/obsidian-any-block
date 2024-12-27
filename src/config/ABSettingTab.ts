/**
 * Obsidian의 플러그인 설정 페이지
 * 
 * TODO: 디버그 로그 스위치
 */

import {App, PluginSettingTab, Setting, Modal} from "obsidian"
import type AnyBlockPlugin from "../main"
import {ABConvertManager} from "src/ABConverter/ABConvertManager"
import {ABConvert, type ABConvert_SpecUser} from "src/ABConverter/converter/ABConvert"
import { ABAlias_json, ABAlias_json_default } from "src/ABConverter/ABAlias"
import { ABCSetting } from "src/ABConverter/ABReg"

// 加载所有选择器
import {} from "src/ab_manager/abm_cm/ABSelector_MdBase"
import {generateSelectorInfoTable} from "src/ab_manager/abm_cm/ABSelector_Md"

/** 설정 값 인터페이스 */
export interface ABSettingInterface {
  // 선택기 모듈 부분
  select_list: ConfSelect           // 리스트 선택기 사용 여부
  select_quote: ConfSelect          // 인용 선택기 사용 여부
  select_code: ConfSelect           // 코드 선택기 사용 여부
  select_heading: ConfSelect        // 헤딩 선택기 사용 여부
  select_brace: ConfSelect          // 중괄호 선택기 사용 여부
  decoration_source: ConfDecoration // 소스 모드에서 사용 여부
  decoration_live: ConfDecoration   // 실시간 모드에서 사용 여부
  decoration_render: ConfDecoration // 읽기 모드에서 사용 여부
  is_neg_level: boolean,            // 부정 헤딩 플래그 `<` 사용 여부 (사실 아직 구현되지 않음)

  // 별명 모듈 부분
  alias_use_default: true,              // 기본 별명 프리셋 사용 (성능 최적화를 위해 끌 수 있음)
  alias_user: {                         // 별명 시스템 (V3.0.8 제공), 사용자가 정의한 별명 (기본 제공 제외)
    regex: string,
    replacement: string
  }[],
  user_processor: ABConvert_SpecUser[],  // 별명 시스템 (구버전), 사용자가 정의한 별명 프로세서

  // 기타
  is_debug: boolean                 // 디버그 출력 사용 여부
}
export enum ConfSelect{
  no = "no",
  ifhead = "ifhead",
  yes = "yes"
}
export enum ConfDecoration{
  none = "none",
  inline = "inline",
  block = "block"
}

// 当前设置值 (有默认项)
export const AB_SETTINGS: ABSettingInterface = {
  select_list: ConfSelect.ifhead,
  select_quote: ConfSelect.ifhead,
  select_code: ConfSelect.ifhead,
  select_heading: ConfSelect.ifhead,
  select_brace: ConfSelect.yes,

  decoration_source: ConfDecoration.none,
  decoration_live: ConfDecoration.block,
  decoration_render: ConfDecoration.block,
  is_neg_level: false,

  alias_use_default: true,
  alias_user: [ // 仅给一个默认示例
    {
      "regex": "|alias_demo|",
      "replacement": "|addClass(ab-custom-text-red)|addClass(ab-custom-bg-blue)|"
    },
    {
      "regex": "/\\|alias_reg_demo\\|/",
      "replacement": "|addClass(ab-custom-text-red)|addClass(ab-custom-bg-blue)|"
    },
  ],
  user_processor: [{ // 仅给一个默认示例
    "id": "alias2_demo",
    "name": "alias2_demo",
    "match": "alias2_demo",
    "process_alias": "|addClass(ab-custom-text-blue)|addClass(ab-custom-bg-red)|"
  }],

  is_debug: false
}

/** 설정 값 패널 */
export class ABSettingTab extends PluginSettingTab {
	plugin: AnyBlockPlugin
  processorPanel: HTMLElement
  selectorPanel: HTMLElement

	constructor(app: App, plugin: AnyBlockPlugin) {
		super(app, plugin);
		this.plugin = plugin;

    // Convert 모듈
    ABCSetting.is_debug = this.plugin.settings.is_debug

    // Alias 모듈, 사용자 정의 별명 로드
    if (!plugin.settings.alias_use_default) {
      ABAlias_json.length = 0 // 배열 비우기
    }
    //   신버전
    for (let item of plugin.settings.alias_user){
      let newReg: string|RegExp;
      if (/^\/.*\/$/.test(item.regex)) {
        newReg = new RegExp(item.regex.slice(1,-1)) // 양쪽의 `/` 제거하고 regExp로 변환
      } else {
        newReg = item.regex
      }
      ABAlias_json.push({
        regex: newReg,
        replacement: item.replacement
      })
    }
    //   구버전
    for (let item of plugin.settings.user_processor){
      ABConvert.factory(item)
    }
	}

	display(): void {
		const {containerEl} = this;
    containerEl.empty();
    let settings = this.plugin.settings
    containerEl.createEl('h1', {text: 'AnyBlock'});
		const div_url = containerEl.createEl('div');
    div_url.innerHTML = `See 
    <a href="https://linczero.github.io/MdNote_Public/ProductDoc/AnyBlock/README.show.html">website</a>
    /
    <a href="https://github.com/LincZero/obsidian-any-block">github</a>
    for more details (더 많은 사용 방법은 Github 및 웹사이트 참조)
    `;
    containerEl.createEl('hr', {attr: {"style": "border-color:#9999ff"}})

    // 선택기 관리
    containerEl.createEl('h2', {text: 'Selector Manager (선택기 관리)'});
    containerEl.createEl('p', {text: '이 섹션은 조회용이며 편집할 수 없습니다 (이 부분은 조회용으로만 제공되며 편집할 수 없습니다)'})
    this.selectorPanel = generateSelectorInfoTable(containerEl)
    containerEl.createEl('hr', {attr: {"style": "border-color:#9999ff"}})

    // 별명 시스템 관리
    containerEl.createEl('h2', {text: 'AliasSystem Manager (별명 시스템 관리)'});
    containerEl.createEl('p', {text: '이 내용은 `[info_alias]` 프로세서를 사용하여 메인 페이지에서도 볼 수 있습니다 (이 부분은 `[info_alias]` 프로세서를 사용하여 메인 페이지에서도 볼 수 있습니다)'});
    containerEl.createEl('p', {text: '이 섹션은 플러그인 폴더의 `data.json` 파일을 열어 수정할 수도 있습니다 (이 부분은 플러그인 폴더의 `data.json` 파일을 열어 수정할 수도 있습니다)'});
    new Setting(containerEl)
      .setName('새 등록 지침 추가')
      .setDesc(`새로운 등록 지침 추가`)
      .addButton(component => {
        component
        .setIcon("plus-circle")
        .onClick(e => {
          new ABModal_alias(this.app, async (result)=>{
            // 1. 객체에 저장
            let newReg: string|RegExp;
            if (/^\/.*\/$/.test(result.regex)) {
              newReg = new RegExp(result.regex.slice(1,-1)) // 양쪽의 `/` 제거하고 regExp로 변환
            } else {
              newReg = result.regex
            }
            ABAlias_json.push({
              regex: newReg,
              replacement: result.replacement
            })
            // 2. 파일에 저장
            await this.plugin.saveSettings();
          }).open()
        })
      })
    new Setting(containerEl)
      .setName('새 등록 지침 추가 (구버전, 사용되지 않음)')
      .setDesc(`새로운 등록 지침 추가 - 구버전, 사용되지 않음`)
      .addButton(component => {
        component
        .setIcon("plus-circle")
        .onClick(e => {
          new ABProcessorModal(this.app, async (result)=>{
            // 1. 객체에 저장
            ABConvert.factory(result)
            settings.user_processor.push(result)
            // 2. 파일에 저장
            await this.plugin.saveSettings();
            // 3. 프로세서의 그래프 새로고침
            this.processorPanel.remove()
            const div = containerEl.createEl("div");
            ABConvertManager.autoABConvert(div, "info", "", "null_content")
            this.processorPanel = div
          }).open()
        })
      })
    containerEl.createEl('hr', {attr: {"style": "border-color:#9999ff"}})

    // 변환기 관리
    containerEl.createEl('h2', {text: 'Convertor Manager (변환기 관리)'});
    containerEl.createEl('p', {text: '이 내용은 `[info]` 프로세서를 사용하여 메인 페이지에서도 볼 수 있습니다 (이 부분은 `[info]` 프로세서를 사용하여 메인 페이지에서도 볼 수 있습니다)'});
    containerEl.createEl('p', {text: '이 섹션은 조회용이며 편집할 수 없습니다 (이 부분은 조회용으로만 제공되며 편집할 수 없습니다)'})
    containerEl.createEl('p', {text: ''});
    const div = containerEl.createEl("div");
    ABConvertManager.autoABConvert(div, "info", "", "null_content") // this.processorPanel = ABConvertManager.getInstance().generateConvertInfoTable(containerEl)
    this.processorPanel = div
	}
}

class ABProcessorModal extends Modal {
  args: ABConvert_SpecUser
  onSubmit: (args: ABConvert_SpecUser)=>void

  constructor(
    app: App, 
    onSubmit: (args: ABConvert_SpecUser)=>void
  ) {
    super(app);
    this.args = {
      id: "",
      name: "",
      match: "",
      process_alias: ""
    }
    this.onSubmit = onSubmit
  }

  onOpen() {	// onOpen() 메서드는 대화 상자가 열릴 때 호출되며, 대화 상자 내의 내용을 생성하는 역할을 합니다. 더 많은 정보를 원하시면 HTML elements를 참조하세요.
    let { contentEl } = this;
    contentEl.setText("Custom processor (사용자 정의 프로세서)");
    contentEl.createEl("p", {text: ""})
    new Setting(contentEl)
      .setName("ProcessorId")
      .setDesc("프로세서 고유 id, 다른 프로세서와 충돌하지 않으면 됨")
      .addText((text)=>{
        text.onChange((value) => {
          this.args.id = value
        })
      })

    new Setting(contentEl)
      .setName("ProcessorName")
      .setDesc("등록기 이름, 자유롭게 입력 가능, 본인 확인용")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.name = value
      })
    })

    new Setting(contentEl)
      .setName("Processor matching rule")
      .setDesc("등록기 매칭 이름 (정규 표현식으로 인식하려면 /로 감싸야 함)")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.match = value
      })
    })

    new Setting(contentEl)
      .setName("Processor replacement")
      .setDesc("등록기 대체 (정규 표현식으로 인식하려면 /로 감싸야 함)")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.process_alias = value
      })
    })

    new Setting(contentEl)
      .addButton(btn => {
        btn
        .setButtonText("Submit (제출)")
        .setCta() // 이게 무슨 뜻인지 모르겠음
        .onClick(() => {
          if(this.args.id && this.args.name && this.args.match && this.args.process_alias){
            this.close();
            this.onSubmit(this.args);
          }
        })
      })
  }

  onClose() {	// onClose() 메서드는 대화 상자가 닫힐 때 호출되며, 대화 상자가 차지한 리소스를 정리하는 역할을 합니다.
    let { contentEl } = this;
    contentEl.empty();
  }
}

class ABModal_alias extends Modal {
  args: {regex: string,replacement: string}
  onSubmit: (args: {regex: string,replacement: string})=>void

  constructor(
    app: App, 
    onSubmit: (args: {regex: string,replacement: string})=>void
  ) {
    super(app);
    this.args = {
      regex: "",
      replacement: ""
    }
    this.onSubmit = onSubmit
  }

  onOpen() {	// onOpen() 메서드는 대화 상자가 열릴 때 호출되며, 대화 상자 내의 내용을 생성하는 역할을 합니다. 더 많은 정보를 원하시면 HTML elements를 참조하세요.
    let { contentEl } = this;
    contentEl.setText("Custom alias (사용자 정의 별명)");
    contentEl.createEl("p", {text: ""})
    new Setting(contentEl)
      .setName("Alias matching rule")
      .setDesc("별명 매칭 규칙 (정규 표현식으로 인식하려면 /로 감싸야 함)")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.regex = value
      })
    })

    new Setting(contentEl)
      .setName("Alias replacement")
      .setDesc("별명 대체")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.replacement = value
      })
    })

    new Setting(contentEl)
      .addButton(btn => {
        btn
        .setButtonText("Submit (제출)")
        .setCta() // 이게 무슨 뜻인지 모르겠음
        .onClick(() => {
          if(this.args.regex && this.args.replacement){
            this.close();
            this.onSubmit(this.args);
          }
        })
      })
  }

  onClose() {	// onClose() 메서드는 대화 상자가 닫힐 때 호출되며, 대화 상자가 차지한 리소스를 정리하는 역할을 합니다.
    let { contentEl } = this;
    contentEl.empty();
  }
}
