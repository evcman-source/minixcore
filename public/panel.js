(function(){
  var JSON_URL = "./rigs.json";
  var REFRESH_MS = 10000;
  var timer = null;

  function $(id){ return document.getElementById(id); }

  function showErr(msg){
    var e = $("err");
    if(e){ e.innerHTML = '<div class="err">⚠ ' + msg + '</div>'; }
  }

  function clearErr(){
    var e = $("err");
    if(e){ e.innerHTML = ""; }
  }

  function xhrJSON(url, cb){
    try{
      var x = new XMLHttpRequest();
      x.open("GET", url + (url.indexOf("?")>-1?"&":"?") + "ts=" + Date.now(), true);
      x.onreadystatechange = function(){
        if(x.readyState === 4){
          if(x.status === 200){
            try{
              var j = JSON.parse(x.responseText);
              cb(null, j);
            }catch(e){
              cb("JSON parse hatası: " + e);
            }
          }else{
            cb("HTTP hatası: " + x.status);
          }
        }
      };
      x.send();
    }catch(e){
      cb("İstek hatası: " + e);
    }
  }

  function sum(arr, key){
    var s = 0;
    if(!arr) return 0;
    for(var i=0;i<arr.length;i++){
      var v = arr[i][key];
      if(typeof v === "number") s += v;
    }
    return s;
  }

  function renderKPIs(rigs){
    var totalHash = 0, totalPower = 0, totalGPU = 0;
    for(var i=0;i<rigs.length;i++){
      var r = rigs[i];
      var gpus = r.gpus || [];
      totalGPU += gpus.length;
      // hash_mhs ve power_w alanlarını GPU bazında topla
      for(var j=0;j<gpus.length;j++){
        var g = gpus[j];
        if(typeof g.hash_mhs === "number") totalHash += g.hash_mhs;
        if(typeof g.power_w === "number") totalPower += g.power_w;
      }
    }
    $("kpi").innerHTML =
      '<span class="kpi"><span class="muted">Toplam Hash</span> · <span class="v">' + totalHash.toFixed(2) + ' MH/s</span></span>' +
      '<span class="kpi"><span class="muted">Toplam Güç</span> · <span class="v">' + Math.round(totalPower) + ' W</span></span>' +
      '<span class="kpi"><span class="muted">Toplam GPU</span> · <span class="v">' + totalGPU + '</span></span>';
  }

  function renderTable(data){
    try{
      var t = $("rigTable");
      if(!data || !data.rigs || !data.rigs.length){
        t.innerHTML =
          "<tr><th>Rig ID</th><th>Ad</th><th>GPU</th><th>Toplam Hash</th><th>Toplam Güç</th></tr>" +
          "<tr><td colspan='5'>Hiç rig yok</td></tr>";
        $("kpi").innerHTML = "";
        return;
      }

      var rigs = data.rigs;
      var rows =
        "<tr><th>Rig ID</th><th>Ad</th><th>GPU</th><th>Toplam Hash</th><th>Toplam Güç</th></tr>";

      for(var i=0;i<rigs.length;i++){
        var r = rigs[i];
        var gpus = r.gpus || [];
        var gpuCount = gpus.length;
        var rigHash = 0, rigPower = 0;

        for(var j=0;j<gpus.length;j++){
          var g = gpus[j];
          if(typeof g.hash_mhs === "number") rigHash += g.hash_mhs;
          if(typeof g.power_w === "number") rigPower += g.power_w;
        }

        rows += "<tr>"
          + "<td>" + (r.rig_id || "") + "</td>"
          + "<td>" + (r.name || "") + "</td>"
          + "<td>" + gpuCount + "</td>"
          + "<td>" + rigHash.toFixed(2) + " MH/s</td>"
          + "<td>" + Math.round(rigPower) + " W</td>"
          + "</tr>";
      }

      t.innerHTML = rows;
      renderKPIs(rigs);
      clearErr();
    }catch(e){
      showErr("Render hatası: " + e);
    }
  }

  function loadOnce(){
    xhrJSON(JSON_URL, function(err, json){
      if(err){ showErr(err); return; }
      renderTable(json);
    });
  }

  function boot(){
    loadOnce();
    if(timer) clearInterval(timer);
    timer = setInterval(loadOnce, REFRESH_MS);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
