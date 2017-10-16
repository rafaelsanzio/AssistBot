var dateFormat = require('dateformat');

exports.pegaDataAtual = function () {
  var data = new Date();
  var dia = data.getDate();
  var mes = data.getMonth() + 1;
  if(mes < 10){
    mes = '0'+mes;
  }
  if(dia < 10){
    dia = '0'+dia;
  }
  var ano = data.getFullYear();
  var dataAtual = ano+'/'+mes+'/'+dia;
  return dataAtual;
};

exports.pegaHoraAgora = function () {
  var data = new Date();
  var hora = data.getHours() - 3;
  var min  = data.getMinutes();
  if((min - 10) < 0){
    min = '0'+min;
  }
  var horaAgora = hora+':'+min;
  return horaAgora;
};


exports.formataDataUS = function (data) {
  var dia = data.substring(0,2);
  var mes = data.substring(3,5);
  var ano = data.substring(6,10);
  data = mes +'/'+ dia +'/'+ ano;
  data = dateFormat(data);
  return data;
};

exports.formataDataBanco = function (data){
  var dia = data.substring(0,2);
  var mes = data.substring(3,5);
  var ano = data.substring(6,10);
  data =  ano +'/'+ mes +'/'+ dia;
  data = dateFormat(data, 'yyyy/mm/dd');
  return data;
};

exports.mesEmExtenso = function (mes){
  var sMes; 
  if(mes == 1){
    sMes = "Janeiro";
  } else if(mes == 2){
    sMes = "Fevereiro";
  } else if(mes == 3){
    sMes = "Março";
  } else if(mes == 4){
    sMes = "Abril";
  } else if(mes == 5){
    sMes = "Maio";
  } else if(mes == 6){
    sMes = "Junho";
  } else if(mes == 7){
    sMes = "Julho";
  } else if(mes == 8){
    sMes = "Agosto";
  } else if(mes == 9){
    sMes = "Setembro";
  } else if(mes == 10){
    sMes = "Outubro";
  } else if(mes == 11){
    sMes = "Novembro";
  } else if(mes == 12){
    sMes = "Dezembro";
  }
  return sMes;
};

exports.mes = function (mesEmExtenso){
  var nMes; 
  if(mesEmExtenso == "Janeiro"){
    nMes = 1;
  } else if(mesEmExtenso == "Fevereiro"){
    nMes = 2;
  } else if(mesEmExtenso == "Março"){
    nMes = 3;
  } else if(mesEmExtenso == "Abril"){
    nMes = 4;
  } else if(mesEmExtenso == "Maio"){
    nMes = 5;
  } else if(mesEmExtenso == "Junho"){
    nMes = 6;
  } else if(mesEmExtenso == "Julho"){
    nMes = 7;
  } else if(mesEmExtenso == "Agosto"){
    nMes = 8;
  } else if(mesEmExtenso == "Setembro"){
    nMes = 9;
  } else if(mesEmExtenso == "Outubro"){
    nMes = 10;
  } else if(mesEmExtenso == "Novembro"){
    nMes = 11;
  } else if(mesEmExtenso == "Dezembro"){
    nMes = 12;
  }
  return nMes;
};