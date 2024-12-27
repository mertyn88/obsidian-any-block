/**
 * AB 변환기의 추상 기본 클래스
 * 
 * @detail
 * 소유권: ABConvertManager
 */

import { ABConvertManager } from "../ABConvertManager"
import type { List_C2ListItem } from "./abc_c2list"
import type { List_ListItem } from "./abc_list"
import type { List_TableItem } from "./abc_table"

/**
 * ab 처리기 하위 인터페이스 - 타입 선언
 * 
 * @detail
 * TODO list와 json 전용 포맷을 추가해야 함
 */
export enum ABConvert_IOEnum {
  text = "string", // string
  el = "HTMLElement", // HTMLElement
  // el_text = "string", // string
  json = "json_string", // string
  list_strem = "array", // object
  c2list_strem = "array2", // object  
}
export type ABConvert_IOType =
  string|           // text/el_text
  HTMLElement|      // html元素
  void|             // TODO void是旧的别名系统，以后要删掉
  List_ListItem|    // 多叉树 数据流
  List_C2ListItem|  // 二层树 数据流
  List_TableItem|   // 表格用 数据流
  Object            // json对象

/**
 * AB 변환기의 추상 기본 클래스
 * 
 * @detail
 * 소유권: ABConvertManager
 */
export class ABConvert {

  /** --------------------------------- 정적 매개변수 -------------------------- */

  id: string                      // 고유 식별자 (match를 입력하지 않으면 매칭 항목으로 사용됨)
  name: string                    // 처리기 이름
  match: RegExp|string            // 처리기 매칭 정규식 (입력하지 않으면 id로 사용됨, name은 번역되거나 중복될 수 있음) 정규식 타입으로 입력하면 드롭다운에 표시되지 않음
  default: string|null            // 드롭다운 선택의 기본 규칙, 입력하지 않으면: 비정규식은 기본적으로 id, 정규식이 있으면 비어 있음
  detail: string                  // 처리기 설명
  process_alias: string           // 조립, 비어 있지 않으면 process 메서드를 덮어쓰지만 여전히 process에 빈 구현을 제공해야 함
  process_param: ABConvert_IOEnum|null
  process_return: ABConvert_IOEnum|null
  process: (el:HTMLDivElement, header:string, content:ABConvert_IOType)=> ABConvert_IOType // html->html 처리기는 content 매개변수를 사용할 필요 없음
  is_disable: boolean = false     // 비활성화 여부, 기본값은 false
  register_from: string = "내장"  // 내장, 다른 플러그인, 패널 설정, 다른 플러그인인 경우 플러그인 이름을 제공해야 함 (자동 인식이 가능한지 모르겠음)
                                  // TODO, 이 항목은 "저자명"으로 수정해야 함, 2차 개발을 장려하기 위해

  /** --------------------------------- 동적 매개변수 -------------------------- */

  // 등록 항목이 아님:
  // ~~is_inner: 이 항목은 설정할 수 없으며 내부인지 외부에서 제공된 것인지 구분하는 데 사용됨~~
  is_enable: boolean = false      // 로드 후 이 항목을 비활성화할 수 있음

  /** --------------------------------- 특수 함수 -------------------------- */

  /// 생성자 + 컨테이너 관리
  public static factory(process: ABConvert_SpecSimp| ABConvert_SpecUser): ABConvert {
    let ret: ABConvert = new ABConvert(process)
    ABConvertManager.getInstance().list_abConvert.push(ret)
    return ret 
  }

  /// 생성자 함수
  /// TODO 등록을 인스턴스 생성으로 수정해야 함, 동적 매개변수가 포함되어 있기 때문
  /// TODO id 충돌 알림
  /// TODO 별명 기능 삭제, 별도 별명 모듈에서 처리, 변환기에 통합하지 않음 
  /// (장점은 변환기 기능의 단일성과 재사용성을 유지하고, 별명을 코드 없이 설정할 수 있으며, 단점은 2차 개발자가 한 번 더 등록하거나 변환기를 독립적으로 설정해야 함)
  constructor(process: ABConvert_SpecSimp| ABConvert_SpecUser) {
    // 등록 버전
    if ('process' in process) {
      this.constructor_simp(process)
    }
    // 별명 버전
    else {
      this.constructor_user(process)
    }
  }

  constructor_simp(sim: ABConvert_SpecSimp) {
    this.id = sim.id
    this.name = sim.name
    this.match = sim.match??sim.id
    this.default = sim.default??(!sim.match||typeof(sim.match)=="string")?sim.id:null
    this.detail = sim.detail??""
    this.process_alias = sim.process_alias??""
    this.process_param = sim.process_param??null
    this.process_return = sim.process_return??null
    this.process = sim.process
    this.is_disable = false
    this.register_from = "내장"
  }

  constructor_user(sim: ABConvert_SpecUser) {
    this.id = sim.id
    this.name = sim.name
    this.match = /^\//.test(sim.match)?RegExp(sim.match):sim.match
    this.default = null
    this.detail = ""
    this.process_alias = sim.process_alias
    this.process_param = null
    this.process_return = null
    this.process = ()=>{}
    this.is_disable = false
    this.register_from = "사용자"
  }

  /// 소멸자 함수
  destructor() {
    // ABConvertManager.getInstance().list_abConvert.remove(this) // 이전, remove 인터페이스는 ob 정의

    const index = ABConvertManager.getInstance().list_abConvert.indexOf(this)
    if (index > -1) {
      ABConvertManager.getInstance().list_abConvert.splice(index, 1)
    }
  }
  
  /** --------------------------------- 처리기 컨테이너 관리 (이전) --------------- */

  /*
  /// 사용자 등록 처리기
  public static registerABProcessor(process: ABProcessorSpec| ABProcessorSpecSimp| ABProcessorSpecUser){
    ABConvertManager.getInstance().list_abConvert.push(ABProcessorSpec.registerABProcessor_adapt(process));
  }

  public static registerABProcessor_adapt(process: ABProcessorSpec| ABProcessorSpecSimp| ABProcessorSpecUser): ABProcessorSpec{
    if ('is_disable' in process) {    // 엄격한 버전 저장 버전
      return process
    }
    else if ('process' in process) {  // 사용자 버전 등록 버전
      return this.registerABProcessor_adapt_simp(process)
    }
    else {                            // 별명 버전 코드 없는 버전
      return this.registerABProcessor_adapt_user(process)
    }
  }

  private static registerABProcessor_adapt_simp(sim: ABProcessorSpecSimp):ABProcessorSpec{
    //type t_param = Parameters<typeof sim.process>
    //type t_return = ReturnType<typeof sim.process>
    const abProcessorSpec: ABProcessorSpec = {
      id: sim.id,
      name: sim.name,
      match: sim.match??sim.id,
      default: sim.default??(!sim.match||typeof(sim.match)=="string")?sim.id:null,
      detail: sim.detail??"",
      process_alias: sim.process_alias??"",
      process_param: sim.process_param??null,
      process_return: sim.process_return??null,
      process: sim.process,
      is_disable: false,
      register_from: "내장",
    }
    return abProcessorSpec
  }

  private static registerABProcessor_adapt_user(sim: ABProcessorSpecUser):ABProcessorSpec{
    const abProcessorSpec: ABProcessorSpec = {
      id: sim.id,
      name: sim.name,
      match: /^\//.test(sim.match)?RegExp(sim.match):sim.match,
      default: null,
      detail: "",
      process_alias: sim.process_alias,
      process_param: null,
      process_return: null,
      process: ()=>{},
      is_disable: false,
      register_from: "사용자",
    }
    return abProcessorSpec
  }
  */
}

/**
 * ab 변환기의 등록 매개변수 타입
 */
export interface ABConvert_SpecSimp{
  id: string                // 고유 식별자 (match를 입력하지 않으면 매칭 항목으로 사용됨)
  name: string              // 처리기 이름
  match?: RegExp|string     // 처리기 매칭 정규식 (입력하지 않으면 id로 사용됨, name은 번역되거나 중복될 수 있음) 정규식 타입으로 입력하면 드롭다운에 표시되지 않음
  default?: string|null     // 드롭다운 선택의 기본 규칙, 입력하지 않으면: 비정규식은 기본적으로 id, 정규식이 있으면 비어 있음
  detail?: string           // 처리기 설명
  process_alias?: string    // 조립, 비어 있지 않으면 process 메서드를 덮어쓰지만 여전히 process에 빈 구현을 제공해야 함
  process_param?: ABConvert_IOEnum
  process_return?: ABConvert_IOEnum
  process: (el:HTMLDivElement, header:string, content:ABConvert_IOType)=> ABConvert_IOType
                            // 처리기. 세 번째 매개변수는 이전에 문자열만 받을 수 있었지만, 이제는 마지막 수정 결과로 변경해야 함
}

/**
 * ab 변환기의 등록 매개변수 타입 - 별명 버전
 * TODO: 후속 삭제, 별명 시스템은 다른 모듈에서 처리
 * 
 * @detail
 * ab 처리기 인터페이스 - 사용자 버전 (모두 문자열로 저장)
 * 특징: process를 등록할 수 없음 (txt에 저장할 수 없음), 별명만 등록 가능
 */
export interface ABConvert_SpecUser{
  id:string
  name:string
  match:string
  process_alias:string
}
