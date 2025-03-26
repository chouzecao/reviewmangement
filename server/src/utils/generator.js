const familyNames = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨',
  '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜',
  '戚', '谢', '邹', '喻', '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎',
  '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳', '酆', '鲍', '史', '唐',
  '费', '廉', '岑', '薛', '雷', '贺', '倪', '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常',
  '乐', '于', '时', '傅', '皮', '卞', '齐', '康', '伍', '余', '元', '卜', '顾', '孟', '平', '黄',
  '和', '穆', '萧', '尹', '姚', '邵', '湛', '汪', '祁', '毛', '禹', '狄', '米', '贝', '明', '臧'
]

const boyNames = [
  '伟', '强', '磊', '军', '洋', '勇', '刚', '杰', '峰', '超', '波', '辉', '涛', '斌', '康', '帅',
  '凯', '浩', '东', '博', '文', '风', '光', '泽', '晨', '瑞', '朗', '兴', '昊', '天', '明', '阳',
  '志', '远', '宇', '浩', '宏', '旭', '诚', '永', '翔', '鸿', '哲', '瀚', '佳', '豪', '弘', '毅'
]

const girlNames = [
  '芳', '娜', '敏', '静', '秀', '娟', '丽', '艳', '洁', '燕', '玲', '雪', '琳', '文', '婷', '雅',
  '琴', '云', '莉', '兰', '梅', '月', '霞', '红', '萍', '玉', '露', '莹', '华', '菊', '珍', '璐',
  '瑶', '婧', '琪', '晶', '妍', '璇', '嘉', '怡', '婉', '倩', '韵', '寒', '馨', '悦', '彤', '蕾'
]

// 陕西省地区编码
const shaanxiAreaCodes = {
  // 西安市
  '610100': {
    '610102': '新城区',
    '610103': '碑林区',
    '610104': '莲湖区',
    '610111': '灞桥区',
    '610112': '未央区',
    '610113': '雁塔区',
    '610114': '阎良区',
    '610115': '临潼区',
    '610116': '长安区',
    '610117': '高陵区',
    '610118': '鄠邑区',
    '610122': '蓝田县',
    '610124': '周至县'
  },
  // 铜川市
  '610200': {
    '610202': '王益区',
    '610203': '印台区',
    '610204': '耀州区',
    '610222': '宜君县'
  },
  // 宝鸡市
  '610300': {
    '610302': '渭滨区',
    '610303': '金台区',
    '610304': '陈仓区',
    '610322': '凤翔县',
    '610323': '岐山县',
    '610324': '扶风县',
    '610326': '眉县',
    '610327': '陇县',
    '610328': '千阳县',
    '610329': '麟游县',
    '610330': '凤县',
    '610331': '太白县'
  },
  // 咸阳市
  '610400': {
    '610402': '秦都区',
    '610403': '杨陵区',
    '610404': '渭城区',
    '610422': '三原县',
    '610423': '泾阳县',
    '610424': '乾县',
    '610425': '礼泉县',
    '610426': '永寿县',
    '610428': '长武县',
    '610429': '旬邑县',
    '610430': '淳化县',
    '610431': '武功县',
    '610481': '兴平市',
    '610482': '彬州市'
  }
}

// 生成随机整数
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成随机中文姓名
const generateName = () => {
  const familyName = familyNames[randomInt(0, familyNames.length - 1)]
  const gender = Math.random() < 0.5 ? 'male' : 'female'
  const namesList = gender === 'male' ? boyNames : girlNames
  
  // 随机决定是双字名还是三字名
  const isTripleName = Math.random() < 0.3 // 30%的概率生成三字名
  
  let givenName
  if (isTripleName) {
    const firstName = namesList[randomInt(0, namesList.length - 1)]
    const secondName = namesList[randomInt(0, namesList.length - 1)]
    givenName = firstName + secondName
  } else {
    givenName = namesList[randomInt(0, namesList.length - 1)]
  }
  
  return {
    name: familyName + givenName,
    gender
  }
}

// 生成随机出生日期
const generateBirthDate = () => {
  // 生成1960-2000年之间的随机日期
  const start = new Date(1960, 0, 1)
  const end = new Date(2000, 11, 31)
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}${month}${day}`
}

// 生成身份证校验码
const generateCheckCode = (body) => {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    sum += parseInt(body[i]) * weights[i]
  }
  
  return codes[sum % 11]
}

// 生成随机身份证号
const generateIdCard = (provinceCode = null) => {
  let areaCode
  
  if (provinceCode === '61') {
    // 陕西省的情况
    const cityKeys = Object.keys(shaanxiAreaCodes)
    const randomCity = cityKeys[randomInt(0, cityKeys.length - 1)]
    const districtKeys = Object.keys(shaanxiAreaCodes[randomCity])
    const randomDistrict = districtKeys[randomInt(0, districtKeys.length - 1)]
    areaCode = randomDistrict
  } else {
    // 其他省份的情况
    const province = provinceCode || String(randomInt(11, 65))
    const city = randomInt(1, 9).toString().padStart(2, '0')
    const district = randomInt(1, 9).toString().padStart(2, '0')
    areaCode = `${province}${city}${district}`
  }
  
  // 生成出生日期
  const birthDate = generateBirthDate()
  
  // 生成3位顺序码（最后一位表示性别，奇数为男，偶数为女）
  const sequence = randomInt(0, 99).toString().padStart(2, '0')
  const gender = Math.random() < 0.5 ? '1' : '2' // 1为男，2为女
  
  // 拼接身份证前17位
  const body = `${areaCode}${birthDate}${sequence}${gender}`
  
  // 计算校验码
  const checkCode = generateCheckCode(body)
  
  return body + checkCode
}

// 生成指定数量的随机用户数据
const generateUsers = (count = 1, provinceCode = null) => {
  const users = []
  for (let i = 0; i < count; i++) {
    const { name, gender } = generateName()
    const idCard = generateIdCard(provinceCode)
    users.push({ name, idCard })
  }
  return users
}

module.exports = {
  generateUsers
} 