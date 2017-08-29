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