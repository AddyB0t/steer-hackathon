// Myth/fact cards shared by Myth Smash and Myth Range. Every card points at a
// cited fact in facts.js. d: which of the 5 big doubts a card answers
// ('daily' = everyday Indian routines).

export const CLAIMS = [
  { d: 'regain', text: 'Weight comes back because of weak willpower', myth: true, fact: 'ghrelin', truth: 'After a diet, hunger hormones rise and fullness hormones fall. That is biology, not willpower.' },
  { d: 'diabetes', text: 'GLP-1 medicines are only for diabetics', myth: true, fact: 'notOnlyDiabetes', truth: 'Large trials tested them in adults with obesity who did not have diabetes.' },
  { d: 'muscle', text: 'Losing weight means losing only fat', myth: true, fact: 'leanMass', truth: 'Body scans show lean mass, including muscle, can go too. It needs protecting.' },
  { d: 'safety', text: 'Side effects are usually severe', myth: true, fact: 'sideEffects', truth: 'In a large trial, most side effects were tummy-related and mild to moderate.' },
  { d: 'forMe', text: 'BMI cut-offs are the same for every body', myth: true, fact: 'asianBmi', truth: 'A WHO expert group flagged lower BMI action points for Asian populations, including Indians.' },
  { d: 'diabetes', text: 'Your gut has nothing to do with feeling full', myth: true, fact: 'gutGlp1', truth: 'Your gut releases GLP-1 after meals, one of your body\'s fullness signals.' },
  { d: 'daily', text: 'Crunches melt tummy fat', myth: true, fact: 'spotReduce', truth: 'In a trial, ab exercises did not cut belly fat. Fat loss happens across the whole body.' },
  { d: 'daily', text: 'Late nights have nothing to do with hunger', myth: true, fact: 'sleep', truth: 'Short sleep lowered leptin, raised ghrelin and made people hungrier.' },
  { d: 'daily', text: 'A glass of fruit juice = eating the fruit', myth: true, fact: 'juice', truth: 'Whole fruit was linked to lower diabetes risk; juice was linked to higher risk.' },
  { d: 'diabetes', text: 'Your gut makes its own GLP-1', myth: false, fact: 'gutGlp1', truth: 'GLP-1 medicines copy a hormone your gut already makes.' },
  { d: 'regain', text: 'Weight can come back after stopping the medicine', myth: false, fact: 'regain', truth: 'In a trial, about two-thirds came back within a year of stopping. Plan the exit.' },
  { d: 'forMe', text: 'Indians can face health risk at a lower BMI', myth: false, fact: 'asianBmi', truth: 'A WHO expert group flagged lower BMI action points for Asian populations.' },
  { d: 'safety', text: 'Common side effects are mostly tummy-related', myth: false, fact: 'sideEffects', truth: 'Nausea and tummy upsets were most common, mostly mild and easing over time.' },
  { d: 'muscle', text: 'Strength training helps protect muscle', myth: false, fact: 'strength', truth: 'Resistance exercise during weight loss helps keep lean muscle.' },
  { d: 'muscle', text: 'Dal, paneer and curd keep you fuller', myth: false, fact: 'protein', truth: 'Higher-protein meals tend to increase fullness.' },
  { d: 'daily', text: 'Sabzi before rice can soften the sugar rise', myth: false, fact: 'foodOrder', truth: 'Veggies and protein first led to a lower sugar rise in a study.' },
  { d: 'daily', text: 'A short walk after meals helps your sugar', myth: false, fact: 'walk', truth: 'Light walks that break up sitting lowered blood sugar after meals.' },
];

export const DOUBT = {
  safety: 'Is it safe?',
  muscle: 'Will I lose muscle?',
  regain: 'Will the weight come back?',
  diabetes: 'Is it only for diabetics?',
  forMe: 'Is it even for me?',
  daily: 'Everyday myths',
};
