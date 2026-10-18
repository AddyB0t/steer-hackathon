// Every claim a game makes lives here, with its source. Games and the readout
// only reference facts by key, so nothing on screen can drift from a citation.

export const FACTS = {
  gutGlp1: {
    title: 'Your gut already makes GLP-1',
    text: 'GLP-1 is a hormone your gut releases after you eat. It helps release insulin, slows how fast the stomach empties and signals fullness. GLP-1 medicines copy this natural signal.',
    source: 'Drucker DJ. Mechanisms of action and therapeutic application of GLP-1. Cell Metab. 2018;27(4):740-756.',
    url: 'https://doi.org/10.1016/j.cmet.2018.03.001',
  },
  protein: {
    title: 'Protein keeps you fuller',
    text: 'Higher-protein meals tend to increase fullness compared with lower-protein meals. Dal, paneer, curd, chana, eggs and fish all count.',
    source: 'Leidy HJ et al. The role of protein in weight loss and maintenance. Am J Clin Nutr. 2015;101(6):1320S-1329S.',
    url: 'https://doi.org/10.3945/ajcn.114.084038',
  },
  fibre: {
    title: 'Fibre slows the sugar rise',
    text: 'Thick, gel-forming fibre slows digestion, so sugar from a meal enters the blood more slowly. Think sabzi, salad, dal and whole grains.',
    source: 'Jenkins DJ et al. Dietary fibres, fibre analogues, and glucose tolerance: importance of viscosity. BMJ. 1978;1(6124):1392-1394.',
    url: 'https://doi.org/10.1136/bmj.1.6124.1392',
  },
  foodOrder: {
    title: 'Order matters: sabzi first, sweets last',
    text: 'In a small study of adults with type 2 diabetes, eating vegetables and protein before carbs led to a lower sugar rise after the same meal.',
    source: 'Shukla AP et al. Food order has a significant impact on postprandial glucose and insulin levels. Diabetes Care. 2015;38(7):e98-e99.',
    url: 'https://doi.org/10.2337/dc15-0429',
  },
  walk: {
    title: 'A short walk helps',
    text: 'Breaking up long sitting with light walking lowered blood sugar after meals across many studies. A walk after lunch is a real tool.',
    source: 'Buffey AJ et al. Interrupting prolonged sitting with standing or light walking: systematic review and meta-analysis. Sports Med. 2022;52:1765-1787.',
    url: 'https://doi.org/10.1007/s40279-022-01649-4',
  },
  ghrelin: {
    title: 'After a diet, hunger gets louder',
    text: 'After weight loss, the body raises the hunger hormone ghrelin and lowers fullness hormones. In one study this was still true a year later. It is biology, not weak willpower.',
    source: 'Sumithran P et al. Long-term persistence of hormonal adaptations to weight loss. N Engl J Med. 2011;365:1597-1604.',
    url: 'https://doi.org/10.1056/NEJMoa1105816',
  },
  regain: {
    title: 'Weight can come back after stopping',
    text: 'One year after stopping a GLP-1 medicine in a large trial, people had regained about two-thirds of the weight they lost. That is why a planned exit matters.',
    source: 'Wilding JPH et al. Weight regain after withdrawal of semaglutide: the STEP 1 trial extension. Diabetes Obes Metab. 2022;24(8):1553-1564.',
    url: 'https://doi.org/10.1111/dom.14725',
  },
  notOnlyDiabetes: {
    title: 'Not only for diabetes',
    text: 'GLP-1 medicines started in diabetes care. Large trials have since tested them in adults with obesity who did not have diabetes. A doctor decides if it fits you.',
    source: 'Wilding JPH et al. Once-weekly semaglutide in adults with overweight or obesity. N Engl J Med. 2021;384:989-1002.',
    url: 'https://doi.org/10.1056/NEJMoa2032183',
  },
  leanMass: {
    title: 'Weight loss is not only fat',
    text: 'Body scans in a large trial showed people lost both fat and lean mass, which includes muscle. Protecting muscle needs a plan: protein, strength work and tracking.',
    source: 'Wilding JPH et al. Once-weekly semaglutide in adults with overweight or obesity (DEXA substudy). N Engl J Med. 2021;384:989-1002.',
    url: 'https://doi.org/10.1056/NEJMoa2032183',
  },
  sideEffects: {
    title: 'Side effects are mostly tummy-related',
    text: 'In a large trial, the most common side effects were nausea, diarrhoea, vomiting and constipation, mostly mild to moderate and easing over time. Screening comes first.',
    source: 'Wilding JPH et al. Once-weekly semaglutide in adults with overweight or obesity. N Engl J Med. 2021;384:989-1002.',
    url: 'https://doi.org/10.1056/NEJMoa2032183',
  },
  asianBmi: {
    title: 'Indian bodies, different numbers',
    text: 'People of Asian descent, including Indians, tend to face metabolic risk at a lower BMI. A WHO expert group flagged lower BMI action points for Asian populations.',
    source: 'WHO Expert Consultation. Appropriate body-mass index for Asian populations. Lancet. 2004;363:157-163.',
    url: 'https://doi.org/10.1016/S0140-6736(03)15268-3',
  },
  sleep: {
    title: 'Short sleep turns hunger up',
    text: 'In a study of healthy young men, two nights of short sleep lowered the fullness hormone leptin, raised ghrelin and increased hunger, especially for carb-heavy foods.',
    source: 'Spiegel K et al. Sleep curtailment in healthy young men is associated with decreased leptin, elevated ghrelin, and increased hunger and appetite. Ann Intern Med. 2004;141(11):846-850.',
    url: 'https://doi.org/10.7326/0003-4819-141-11-200412070-00008',
  },
  juice: {
    title: 'Eat the fruit, skip the juice',
    text: 'In large long-term studies, eating whole fruits like apples and grapes was linked to lower type 2 diabetes risk, while fruit juice was linked to higher risk.',
    source: 'Muraki I et al. Fruit consumption and risk of type 2 diabetes: results from three prospective longitudinal cohort studies. BMJ. 2013;347:f5001.',
    url: 'https://doi.org/10.1136/bmj.f5001',
  },
  strength: {
    title: 'Strength work protects muscle',
    text: 'Resistance exercise during weight loss helps keep lean muscle, especially when paired with enough protein.',
    source: 'Cava E et al. Preserving healthy muscle during weight loss. Adv Nutr. 2017;8(3):511-519.',
    url: 'https://doi.org/10.3945/an.116.014506',
  },
  spotReduce: {
    title: 'Crunches do not melt belly fat',
    text: 'In a 6-week trial, adding abdominal exercises did not reduce belly fat compared with diet alone. Fat loss happens across the whole body.',
    source: 'Vispute SS et al. The effect of abdominal exercise on abdominal fat. J Strength Cond Res. 2011;25(9):2559-2564.',
    url: 'https://doi.org/10.1519/JSC.0b013e3181fb4a46',
  },
};

// Steer's own process, from the brief. Shown as "how Steer handles it", never as a study.
export const STEER = {
  safety: 'Diagnostics first. Blood tests and screening come before any medicine, and a doctor prescribes GLP-1 only when it is clinically right.',
  muscle: 'A DEXA scan measures your fat and muscle at the start, and your plan builds in protein and strength work to protect muscle.',
  regain: 'Habits are built from day one, and you leave with a personalised long-term maintenance plan for life after the medicine.',
  forMe: 'A physician reviews your tests and history. No obligation: if it is not right for you, they will say so.',
  daily: 'A dedicated doctor, care manager and dietician check in daily on WhatsApp, around real Indian meals.',
};
