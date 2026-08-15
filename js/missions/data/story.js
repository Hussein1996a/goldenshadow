/* ===== Golden Shadow — Story missions (30) ===== */
const L = (en, ar) => ({ en, ar });

const STORY_MISSIONS = [
  {
    id: 'story_001', type: 'story', level: 1, requires: null, reward: 500, location: 'goldst',
    title: L('Arrival on Golden Street', 'الوصول إلى الشارع الذهبي'),
    desc: L('You just got off the bus in the worst part of town. Darius, a local boss, wants to see what you are made of. Go meet him at Golden Street.', 'وصلت لتوّك بالحافلة إلى أسوأ أحياء المدينة. داريوس، أحد زعماء المنطقة، يريد أن يختبر قدراتك. اذهب لمقابلته في الشارع الذهبي.'),
    objs: [['goto', 'goldst']]
  },
  {
    id: 'story_002', type: 'story', level: 1, requires: 'story_001', reward: 700, location: 'market',
    title: L('First Deal', 'أول صفقة'),
    desc: L('Darius wants you to collect a package from the Market and deliver it to his safehouse in Old Town. Do not open it.', 'يريد داريوس أن تجمع طردًا من السوق وتسلّمه إلى بيته الآمن في المدينة القديمة. لا تفتحه.'),
    objs: [
      ['goto', 'market'],
      ['deliver', 'market', 'oldtown']
    ]
  },
  {
    id: 'story_003', type: 'story', level: 1, requires: 'story_002', reward: 900, location: 'southside',
    title: L('Prove Yourself', 'أثبت نفسك'),
    desc: L('Some thugs from South Side are pushing into our turf. Show them we do not tolerate visitors. Clear them out.', 'بعض البلطجية من الجانب الجنوبي يتسللون إلى منطقتنا. أظهِر لهم أننا لا نتسامح مع الزوار. صفِّهم.'),
    objs: [
      ['goto', 'southside'],
      ['kill', 4, 'southside', 'thug']
    ]
  },
  {
    id: 'story_004', type: 'story', level: 2, requires: 'story_003', reward: 1200, location: 'oldtown',
    title: L('A Message to the Gang', 'رسالة إلى العصابة'),
    desc: L('Darius wants a message sent. Take out the gang leader guarding the Old Town square and grab his stash.', 'يريد داريوس إرسال رسالة. اقتل زعيم العصابة الذي يحرس ساحة المدينة القديمة واستولِ على مخزونه.'),
    objs: [
      ['goto', 'oldtown'],
      ['kill', 5, 'oldtown', 'gang'],
      ['collect', 3, 'oldtown']
    ]
  },
  {
    id: 'story_005', type: 'story', level: 2, requires: 'story_004', reward: 1500, location: 'dockyard',
    title: L('The Night Run', 'التوصيلة الليلية'),
    desc: L('A cargo ship docks at midnight. Steal the truck from the dockyard and deliver it to the Factory before sunrise.', 'ترسو سفينة شحن عند منتصف الليل. اسرق الشاحنة من الرصيف وسلّمها إلى المصنع قبل الفجر.'),
    objs: [
      ['steal', 'truck', 'dockyard', 'factory']
    ]
  },
  {
    id: 'story_006', type: 'story', level: 2, requires: 'story_005', reward: 1800, location: 'university',
    title: L('The Protection', 'الحماية'),
    desc: L('A professor at the university owes Darius money. Persuade his student bodyguards to stand down.', 'أستاذ في الجامعة مدين بالمال لداريوس. أقنع حراسه من الطلاب بالانسحاب.'),
    objs: [
      ['goto', 'university'],
      ['kill', 4, 'university', 'thug']
    ]
  },
  {
    id: 'story_007', type: 'story', level: 3, requires: 'story_006', reward: 2200, location: 'uptown',
    title: L('New Territory', 'أرض جديدة'),
    desc: L('Time to expand. The Uptown streets are rich but guarded. Clear the way for our dealers.', 'حان وقت التوسّع. شوارع الحي الراقي غنية لكنها محروسة. مهّد الطريق لمتعاملينا.'),
    objs: [
      ['goto', 'uptown'],
      ['kill', 5, 'uptown', 'gang']
    ]
  },
  {
    id: 'story_008', type: 'story', level: 3, requires: 'story_007', reward: 2500, location: 'eastside',
    title: L('Eastside Warehouse', 'مستودع الشرق'),
    desc: L('Our rivals stockpile weapons in the Eastside warehouse. Raid it and collect their crates.', 'يحتفظ منافسونا بأسلحة في مستودع الجانب الشرقي. اقتحمه واجمع صناديقهم.'),
    objs: [
      ['goto', 'eastside'],
      ['kill', 6, 'eastside', 'gang'],
      ['collect', 4, 'eastside']
    ]
  },
  {
    id: 'story_009', type: 'story', level: 3, requires: 'story_008', reward: 3000, location: 'harbor',
    title: L('The Payback', 'الدفع'),
    desc: L('The Cartel burned one of our trucks. Return the favor at the harbor and burn theirs.', 'أحرق الكارتيل إحدى شاحناتنا. ردّ الجميل في الميناء وأحرق شاحناتهم.'),
    objs: [
      ['goto', 'harbor'],
      ['kill', 6, 'harbor', 'cartel'],
      ['destroy', 2, 'harbor']
    ]
  },
  {
    id: 'story_010', type: 'story', level: 4, requires: 'story_009', reward: 3500, location: 'casino',
    title: L('The Gift', 'الهدية'),
    desc: L('A casino owner insulted Darius. Plant the surprise package in his parking garage and get out.', 'أهان صاحب كازينو داريوس. ازرع الطرد المفاجئ في مرآبه واخرج سريعًا.'),
    objs: [
      ['steal', 'sports', 'casino', 'oldtown'],
      ['deliver', 'oldtown', 'casino']
    ]
  },
  {
    id: 'story_011', type: 'story', level: 4, requires: 'story_010', reward: 4000, location: 'strip',
    title: L('Gang War', 'حرب العصابات'),
    desc: L('All-out war on the Strip. Hold the line and survive the waves of rival gang members.', 'حرب شاملة في شارع النوادي. اصمد في الخط الأمامي ونجُ من موجات أفراد العصابة المنافسة.'),
    objs: [
      ['goto', 'strip'],
      ['survive', 60, 'strip', 8]
    ]
  },
  {
    id: 'story_012', type: 'story', level: 4, requires: 'story_011', reward: 4500, location: 'bridge',
    title: L('Roadblock', 'حاجز الطريق'),
    desc: L('The Mob set up a roadblock on the bridge to intercept our convoy. Break through it.', 'أقامت المافيا حاجز طريق على الجسر لاعتراض قافلتنا. اخترق الحاجز.'),
    objs: [
      ['goto', 'bridge'],
      ['kill', 7, 'bridge', 'mob']
    ]
  },
  {
    id: 'story_013', type: 'story', level: 5, requires: 'story_012', reward: 5000, location: 'police',
    title: L('Inside Mole', 'جاسوس داخلي'),
    desc: L('There is a rat inside our organization feeding the police. Deal with him at the police station district.', 'يوجد جاسوس داخل منظمتنا يزوّد الشرطة بالمعلومات. تصرَّف معه في حي مقر الشرطة.'),
    objs: [
      ['goto', 'police'],
      ['find', 2, 'police'],
      ['kill', 5, 'police', 'cop']
    ]
  },
  {
    id: 'story_014', type: 'story', level: 5, requires: 'story_013', reward: 5500, location: 'factory',
    title: L('The Big Trafficker', 'المهرّب الكبير'),
    desc: L('A big trafficker is buying product from the factory tonight. Intercept the deal and take the cash.', 'يشتري مهرّب كبير بضاعة من المصنع الليلة. اعترض الصفقة واستولِ على النقود.'),
    objs: [
      ['goto', 'factory'],
      ['kill', 6, 'factory', 'trafficker'],
      ['collect', 3, 'factory']
    ]
  },
  {
    id: 'story_015', type: 'story', level: 5, requires: 'story_014', reward: 6000, location: 'slums',
    title: L('Betrayal', 'خيانة'),
    desc: L('Your old friend turned on you and fled to the Slums with Darius money. Bring him in — dead or alive.', 'انقلب صديقك القديم عليك وهرب إلى الأحياء الفقيرة بأموال داريوس. أحضره — حيًا أو ميتًا.'),
    objs: [
      ['goto', 'slums'],
      ['kill', 6, 'slums', 'thug'],
      ['find', 2, 'slums']
    ]
  },
  {
    id: 'story_016', type: 'story', level: 6, requires: 'story_015', reward: 7000, location: 'missionrow',
    title: L('Revenge', 'الانتقام'),
    desc: L('Darius was ambushed. Find who ordered it and burn their operation in Mission Row.', 'تعرض داريوس لكمين. اكتشف من أمر بذلك واحرق عمليتهم في شارع المهام.'),
    objs: [
      ['goto', 'missionrow'],
      ['kill', 8, 'missionrow', 'mob'],
      ['destroy', 2, 'missionrow']
    ]
  },
  {
    id: 'story_017', type: 'story', level: 6, requires: 'story_016', reward: 8000, location: 'bank',
    title: L('Bank Heist', 'سرقة البنك'),
    desc: L('The Central Bank is our biggest score yet. Steal the armored car and deliver it to the garage.', 'البنك المركزي هو أكبر صفقة لنا حتى الآن. اسرق السيارة المدرّعة وسلّمها إلى الجراج.'),
    objs: [
      ['steal', 'truck', 'bank', 'garage']
    ]
  },
  {
    id: 'story_018', type: 'story', level: 6, requires: 'story_017', reward: 8500, location: 'hotel',
    title: L('Hostages', 'الرهائن'),
    desc: L('The police took hostages at the hotel to lure us out. Free the area and escape the heat.', 'احتجزت الشرطة رهائن في الفندق لاستدراجنا. حرّر المنطقة واهرب من مطاردتهم.'),
    objs: [
      ['goto', 'hotel'],
      ['kill', 7, 'hotel', 'cop']
    ]
  },
  {
    id: 'story_019', type: 'story', level: 7, requires: 'story_018', reward: 9500, location: 'casino',
    title: L('Casino Night', 'ليلة الكازينو'),
    desc: L('A high-stakes night at the casino. Clean out the mob\'s vault guards and take the money.', 'ليلة عالية المخاطر في الكازينو. صفِّ حراس خزنة المافيا واستولِ على الأموال.'),
    objs: [
      ['goto', 'casino'],
      ['kill', 8, 'casino', 'mob'],
      ['collect', 5, 'casino']
    ]
  },
  {
    id: 'story_020', type: 'story', level: 7, requires: 'story_019', reward: 10000, location: 'airport',
    title: L('The Airport Job', 'مهمة المطار'),
    desc: L('Product is landing at the airport. Steal the cargo van before the feds get to it.', 'البضاعة قادمة إلى المطار. اسرق شاحنة الشحن قبل وصول العملاء الفيدراليين.'),
    objs: [
      ['goto', 'airport'],
      ['kill', 6, 'airport', 'merc'],
      ['steal', 'van', 'airport', 'dockyard']
    ]
  },
  {
    id: 'story_021', type: 'story', level: 7, requires: 'story_020', reward: 11000, location: 'university',
    title: L('The Hack', 'الاختراق'),
    desc: L('Nadia, our hacker, needs the university server data. Protect her crew while they copy the files.', 'نادية، مبرمجتنا، تحتاج بيانات خوادم الجامعة. احمِ فريقها أثناء نسخ الملفات.'),
    objs: [
      ['goto', 'university'],
      ['survive', 75, 'university', 10]
    ]
  },
  {
    id: 'story_022', type: 'story', level: 8, requires: 'story_021', reward: 12000, location: 'factory',
    title: L('Abandoned Factory', 'المصنع المهجور'),
    desc: L('The Cartel moved operations into the abandoned factory. Clear the whole floor.', 'نقل الكارتيل عملياته إلى المصنع المهجور. صفِّ الطابق بأكمله.'),
    objs: [
      ['goto', 'factory'],
      ['kill', 10, 'factory', 'cartel']
    ]
  },
  {
    id: 'story_023', type: 'story', level: 8, requires: 'story_022', reward: 13000, location: 'hills',
    title: L('Iron Fist', 'قبضة حديدية'),
    desc: L('The Hills mansion is the Cartel\'s headquarters. Storm the gates and take the safe.', 'قصر التلال هو مقر الكارتيل الرئيسي. اقتحم البوابات واستولِ على الخزنة.'),
    objs: [
      ['goto', 'hills'],
      ['kill', 9, 'hills', 'cartel'],
      ['collect', 4, 'hills']
    ]
  },
  {
    id: 'story_024', type: 'story', level: 8, requires: 'story_023', reward: 14000, location: 'southside',
    title: L('King of the Hoods', 'ملك الأحياء'),
    desc: L('Every hood from the Slums to the Beach pays tribute to you now. Collect from the South Side first.', 'كل حي من الأحياء الفقيرة إلى الشاطئ يدفع الجزية لك الآن. اجمع من الجانب الجنوبي أولاً.'),
    objs: [
      ['goto', 'southside'],
      ['kill', 8, 'southside', 'gang'],
      ['deliver', 'southside', 'oldtown']
    ]
  },
  {
    id: 'story_025', type: 'story', level: 9, requires: 'story_024', reward: 15000, location: 'harbor',
    title: L('The Harbor Deal', 'صفقة الميناء'),
    desc: L('The biggest shipment in city history lands at the harbor tonight. Secure the docks.', 'أكبر شحنة في تاريخ المدينة تصل إلى الميناء الليلة. أمّن الأرصفة.'),
    objs: [
      ['goto', 'harbor'],
      ['kill', 9, 'harbor', 'merc'],
      ['survive', 60, 'harbor', 6]
    ]
  },
  {
    id: 'story_026', type: 'story', level: 9, requires: 'story_025', reward: 16000, location: 'bridge',
    title: L('The Last Bridge', 'الجسر الأخير'),
    desc: L('A convoy crosses the bridge with our rivals\' cash. Take it before they reach Uptown.', 'تمر قافلة على الجسر تحمل أموال منافسينا. استولِ عليها قبل وصولهم إلى الحي الراقي.'),
    objs: [
      ['goto', 'bridge'],
      ['kill', 8, 'bridge', 'mob'],
      ['destroy', 2, 'bridge']
    ]
  },
  {
    id: 'story_027', type: 'story', level: 9, requires: 'story_026', reward: 17000, location: 'strip',
    title: L('Wolf and Shadow', 'الذئب والظل'),
    desc: L('The Wolf — a rival kingpin — challenges you to a showdown on the Strip. Show him who owns this city.', 'يتحداك "الذئب" — زعيم منافس — في مواجهة على شارع النوادي. أره من يملك هذه المدينة.'),
    objs: [
      ['goto', 'strip'],
      ['kill', 10, 'strip', 'gang']
    ]
  },
  {
    id: 'story_028', type: 'story', level: 10, requires: 'story_027', reward: 19000, location: 'missionrow',
    title: L('Coup', 'انقلاب'),
    desc: L('Some of Darius\' old men want you out. They gathered at Mission Row. End the rebellion.', 'بعض رجال داريوس القدامى يريدون إقصاءك. تجمعوا في شارع المهام. أنهِ التمرد.'),
    objs: [
      ['goto', 'missionrow'],
      ['kill', 10, 'missionrow', 'mob'],
      ['collect', 4, 'missionrow']
    ]
  },
  {
    id: 'story_029', type: 'story', level: 10, requires: 'story_028', reward: 21000, location: 'police',
    title: L('The Confrontation', 'المواجهة'),
    desc: L('The Police Commissioner has been bribed by your enemies. Confront him at the HQ and burn the files.', 'رشا مفوّض الشرطة أعداؤك. واجهه في المقر الرئيسي وأحرق الملفات.'),
    objs: [
      ['goto', 'police'],
      ['kill', 10, 'police', 'cop'],
      ['destroy', 3, 'police']
    ]
  },
  {
    id: 'story_030', type: 'story', level: 11, requires: 'story_029', reward: 30000, location: 'tower',
    title: L('King of Shadow', 'ملك الظل'),
    desc: L('Every enemy you ever made stands between you and the Shadow Tower. Take the crown.', 'كل عدو صنعته يقف بينك وبين برج الظل. استولِ على التاج.'),
    objs: [
      ['goto', 'tower'],
      ['kill', 12, 'tower', 'cartel'],
      ['survive', 90, 'tower', 8]
    ]
  }
];
