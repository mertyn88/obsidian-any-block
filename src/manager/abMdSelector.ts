/** 匹配关键字接口 */
export interface MdSelectorSpec {
  from: number,     // 替换范围
  to: number,       // .
  header: string,   // 头不是信息
  selector: string, // 范围选择方式
  content: string      // 内容信息
}

/** 管理器列表 */
export let list_ABMdSelector:any[]=[]
// 原来ts也有py那样的注册器? 叫类装饰器
// @warning: https://blog.csdn.net/m0_38082783/article/details/127048237
function register_list_mdSelector(){
  return function (target: Function){
    list_ABMdSelector.push(target)
  }
}

/** AnyBlock范围管理器
 * 一段文字可以生成一个实例，主要负责返回RangeSpec类型
 * 一次性使用
 */
export class ABMdSelector{
  mdText: string = ""     // 全文文本
  /** 行数 - total_ch 映射表
   * 该表的长度是 行数+1
   * map_line_ch[i] = 序列i行最前面的位置
   * map_line_ch[i+1]-1 = 序列i行最后面的位置
   */
  map_line_ch: number[]  // line-ch 映射表
  _specKeywords:MdSelectorSpec[]
  public get specKeywords(){
    return this._specKeywords
  }

  constructor(mdText: string){
    this.mdText = mdText

    this.map_line_ch = [0]
    let count_ch = 0
    for (let line of mdText.split("\n")){
      count_ch = count_ch + line.length + 1
      this.map_line_ch.push(count_ch)
    }
    
    this._specKeywords = this.blockMatch_keyword()
  }

  protected blockMatch_keyword(): MdSelectorSpec[]{
    throw("Error: 没有重载 ABRangeManager::blockMatch_keyword")
  }
}

@register_list_mdSelector()
class ABMdSelector_brace extends ABMdSelector {
  reg_front: RegExp
  reg_end: RegExp
  list_reg: RegExp[]
  reg_total: RegExp

  /** 块 - 匹配关键字 */
  protected blockMatch_keyword(): MdSelectorSpec[] {
    this.reg_front = /^{\[.*?\]/
    this.reg_end = /^}./
    //this.list_reg = [this.reg_k1, this.reg_k2]
    //this.reg_total = new RegExp(this.list_reg.map((pattern) => pattern.source).join("|"), "gmi")

    return this.lineMatch_keyword()
  }

   /** 行 - 匹配关键字（非内联） */
   private lineMatch_keyword(): MdSelectorSpec[] {
    const matchInfo: MdSelectorSpec[] = []
    const list_text = this.mdText.split("\n")
    let prev_front_line:number[] = []
    for (let i=0; i<list_text.length; i++){
      if(this.reg_front.test(list_text[i])){       // 前缀
        prev_front_line.push(i)
      }
      else if(this.reg_end.test(list_text[i])){  // 后缀
        if(prev_front_line && prev_front_line.length>0){
          const from_line = prev_front_line.pop()??0 // @warning 有可能pop出来undefine?
          const from = this.map_line_ch[from_line]
          const to = this.map_line_ch[i+1]-1
          matchInfo.push({
            from: from,
            to: to,
            header: list_text[from_line].slice(2,-1),
            selector: "brace",
            content: this.mdText.slice(this.map_line_ch[from_line+1], to-3)
          })
        }
      }
    }
    return matchInfo
  }
}

@register_list_mdSelector()
class ABMdSelector_list extends ABMdSelector{
  reg_list: RegExp

  protected blockMatch_keyword(): MdSelectorSpec[] {
    this.reg_list = /^\s*?-\s(.*)$/
    return  this.lineMatch_keyword()
  }

  private lineMatch_keyword(): MdSelectorSpec[] {
    let matchInfo2:{
      line_from:number, 
      line_to:number,
      list_header:string
    }[] = []
    const list_text = this.mdText.split("\n")
    let list_header = ""
    let is_list_mode = false  // 是否在列表中
    let prev_list_from = 0    // 在列表中时，在哪开始
    for (let i=0; i<list_text.length; i++){
      if (this.reg_list.test(list_text[i])){  // 该行是列表
        if (is_list_mode) continue            // 已经进入列表中
        else{
          if (i!=0){
            const header = list_text[i-1].match(/^\s*\[(.*?)\]/)
            if (header){
              prev_list_from = i-1
              list_header = header[1]
            }
            else{
              prev_list_from = i
            }
          }
          else { prev_list_from = i }
          is_list_mode = true
          continue
        }
      }
      else if (/^\s+?\S/.test(list_text[i])){ // 开头有缩进
        continue
      }
      else {                                  // 该行不是列表
        if (is_list_mode) {                   // 已经进入列表中
          matchInfo2.push({
            line_from: prev_list_from,
            line_to: i,
            list_header: list_header
          })
          is_list_mode = false
          list_header = ""
        }
        continue
      }
    }
    if (is_list_mode){                        // 结束循环收尾
      matchInfo2.push({
        line_from: prev_list_from,
        line_to: list_text.length,
        list_header: list_header
      })
      is_list_mode = false
      list_header = ""
    }

    const matchInfo: MdSelectorSpec[] = []
    for (let item of matchInfo2){
      const from = this.map_line_ch[item.line_from]
      const to = this.map_line_ch[item.line_to]-1
      matchInfo.push({
        from: from,
        to: to,
        header: item.list_header.indexOf("2")==0?"list"+item.list_header:item.list_header, // list选择器语法糖
        selector: "list",
        content: item.list_header==""?
          this.mdText.slice(from, to):
          this.mdText.slice(this.map_line_ch[item.line_from+1], to)
      })
    }

    return matchInfo
  }
}

// 旧brace方法（内联用），现在的方法不能搞内联，这些代码先注释着等以后备用
{
  /** 行 - 匹配关键字（内联） */
  /*private lineMatch_keyword_line(): RangeSpec[] {
    const matchInfo: RangeSpec[] = []
    const matchList: RegExpMatchArray|null= this.mdText.match(this.reg_total);        // 匹配项

    if (!matchList) return []
    let prevIndex = 0
    for (const matchItem of matchList){
      const from2 = this.mdText.indexOf(matchItem, prevIndex)
      const to2 = from2 + matchItem.length;
      prevIndex = to2;
      let reg_match // 匹配的正则项
      for (let reg in this.list_reg){
        if (matchItem.match(reg)) {reg_match = reg; break;}
      }
      matchInfo.push({
        from: from2,//////////////////// @bug 还要去除brace模式的头部信息，然后填写text
        to: to2,
        header: matchItem,
        match: String(reg_match),
        text: ""
      })
    }
    return matchInfo
  }*/

  /** 转化 - 匹配关键字 */
  /*private line2BlockMatch(listSpecKeyword: RangeSpec[]): RangeSpec[]{
    let countBracket = 0  // 括号计数
    let prevBracket = []  // 括号栈
    let listSpecKeyword_new: RangeSpec[] = []
    for (const matchItem of listSpecKeyword) {
      if (matchItem.header=="%{") {
        countBracket++
        prevBracket.push(matchItem.from)
      }
      else if(matchItem.header=="%}" && countBracket>0) {
        countBracket--
        const from = prevBracket.pop() as number
        listSpecKeyword_new.push({
          from: from,
          to: matchItem.to,
          header: "",
          match: "brace",
          text: this.mdText.slice(from+2, matchItem.to-2)
        })
      }
    }
    return listSpecKeyword_new
  }*/
}
