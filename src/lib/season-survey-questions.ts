export type Question={id:string;label:string;type:"rating"|"nps"|"single"|"multi"|"text";options?:string[]};
export const defaultQuestions:Question[]=[
{id:"satisfaction",label:"Wie zufrieden seid ihr insgesamt mit FAS-NAV?",type:"rating"},
{id:"usability",label:"Wie einfach war die Verwaltung eurer Organisationsseite?",type:"rating"},
{id:"used",label:"Welche Funktionen habt ihr genutzt?",type:"multi",options:["Profil","Agenda","Galerie","Hörproben","Statistiken","Inserate","Social Media Studio"]},
{id:"valuable",label:"Welche Funktion war am wertvollsten?",type:"single",options:["Profil","Agenda","Galerie","Hörproben","Statistiken","Inserate","Social Media Studio"]},
{id:"issues",label:"Was hat euch gefehlt oder gestört?",type:"text"},
{id:"wishes",label:"Welche Funktionen wünscht ihr euch?",type:"multi",options:["Mehr Sichtbarkeit","Event-Promotion","Besucherstatistiken","Profilgestaltung","Weitere Integrationen"]},
{id:"recommend",label:"Wie wahrscheinlich ist es, dass ihr FAS-NAV weiterempfehlt?",type:"nps"},
{id:"comments",label:"Weitere Ideen und Anregungen",type:"text"}
];
