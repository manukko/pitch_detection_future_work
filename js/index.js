var note = []; //vettore di note
function noteCreator(){
  for(var i = 0; i<88;i++) {
    note[i] = Math.round(27.5*Math.pow(2,1/12)**i);
  }
}
noteCreator();


var audioContext = new AudioContext();
var oscStop = 0;
var gates = 0;

function attack(Index) {
  var freq = note[Index];
  var o = audioContext.createOscillator();
  var g = audioContext.createGain();
  o.connect(g);
  g.connect(audioContext.destination);
  o.frequency.value = freq;
  g.gain.value = 0.5;
  //now[freq]= c.currentTime;
  //g.gain.linearRampToValueAtTime(1,now[freq]+0.01);
  o.start();
  gates = g;
  oscStop = o;
}

function release(g,o) {
  //var oscStopTemp = [oscStop[midiNote],oscStop2[midiNote],oscStop3[midiNote]];
  g.gain.linearRampToValueAtTime(0,audioContext.currentTime+0.2);
  o.stop(audioContext.currentTime+0.31);
}

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be

var findFundamentalFreq = function( buf, sampleRate ) {
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var lastCorrelation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
			// (anti-aliased) offset.

			// we know best_offset >=1,
			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
			// we can't drop into this clause until the following pass (else if).
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
      console.log("BUONA CORRRELAZIONE");

      var fundamentalFreq = sampleRate / (best_offset+(8*shift));
      var ret = 0;
      var i = 0;
      while(ret === 0){
        if(fundamentalFreq > note[i]) i++;
        else {
          if(note[i]-fundamentalFreq > fundamentalFreq-note[i-1]) ret = i-1;
          else ret = i;
        }
      }
		return ret;

		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
    console.log("BESTCORR > 0.01");
    var fundamentalFreq = sampleRate / (best_offset);
      var ret = 0;
      var i = 0;
      while(ret === 0){
        if(fundamentalFreq > note[i]) i++;
        else {
          if(note[i]-fundamentalFreq > fundamentalFreq-note[i-1]) ret = i-1;
          else ret = i;
        }
      }
		return ret;
	}
	return -1;

//	var best_frequency = sampleRate/best_offset;
};




var freqArray = [];
var frameId;
var vectorLength = 4; //lunghezza del vettore su cui mediare, piu è lungo piu è lento
var tempNext = 0; //salva il primo valore che mi viene preso e lo aggiorna ogni volta che il vettore di note viene mediato
var tempPrev = 0; //viene aggiornato dopo aver fatto attack and release, serve per controllare se due medie di due vettori che si susseguono sono uguali
var tempThird = 0; //ci metto il valore di tempNext
var globali = 0;


var detectPitch = function () {

  var buffer = new Float32Array(2048);

	analyserAudioNode.getFloatTimeDomainData( buffer );

	//var fundalmentalFreq = findFundamentalFreq(buffer, audioContext.sampleRate); DA USARE
  //document.getElementById("p1").innerHTML = fundalmentalFreq;
  freqArray.push(findFundamentalFreq(buffer, audioContext.sampleRate));

  if(freqArray.length == vectorLength) {
    var avg = 0;
    filteredFreq = [];
    for(i=0; i<vectorLength; i++) {
      if(freqArray[i] != -1 && freqArray[i] != 0 && freqArray[i]>20 && freqArray[i]<70)
        filteredFreq.push(freqArray[i]);
    }
    var sum = 0;
    if (filteredFreq.length != 0) {
      for(j=0; j<filteredFreq.length; j++) {
        sum += filteredFreq[j];
      }
      avg = sum/filteredFreq.length;
    }
    //console.log(avg);
    avg = Math.round(avg);  //media del vettore di frequenze (note del pianoforte da 0 a 88)
    //tempPrec = avg;
    if(avg==0)
      document.getElementById("p1").innerHTML = " ";
    else
      document.getElementById("p1").innerHTML = Math.round(27.5*Math.pow(2,1/12)**avg);

/*
    if((tempPrec < tempNext+1 && tempPrec > tempNext-1)){
      //se la media di vettori susseguenti sfalza di qualche semitono continuo a tenere la nota iniziale

      tempPrec = tempThird;
      tempNext = tempThird;

    if(tempPrec === tempNext  && avg!=0){
      tempThird = tempPrec; //tempThird mi tiene l'average in modo tale da poter fare piu controlli
     // console.log(globali);
      if(globali === 0 && avg < 68 ){
        attack(avg);
        globali = globali+1; //controllo che mi serve per farlo entrare nell'else if cosi utilizzo il release
      }
    }
   //Mettere il microbit che cambia la variabile globali (es = 27) in modo che chiudo l'armonica quando voglio io
   //lavorare sul attack quando salva i valori su gates e oscStop in modo tale che si faccia l'attack solo se gates e oscStop sono vuoti
    else if(globali!=0) {
      console.log(globali);
      globali = 0;
      release(gates,oscStop);
    }
    }

    if(tempPrec > 75){  //stupido controllo per non farmi suonare le note altissime da 75 in su altrimenti mi scoppia la testa
       tempNext = 0;
     }

    tempNext = tempPrec;
*/

    freqArray = [];
  }


	frameId = window.requestAnimationFrame(detectPitch);
};





















//stream gestion

var analyserAudioNode, sourceAudioNode, micStream;
var streamReceived = function(stream) {
  micStream = stream;

  audioContext.resume();
  analyserAudioNode = audioContext.createAnalyser();
  analyserAudioNode.fftSize = 2048;

  sourceAudioNode = audioContext.createMediaStreamSource(micStream);
  sourceAudioNode.connect(analyserAudioNode);

  /* This is our pitch detection algorithm.
     You can find its implementation in the Autocorrelation section of this demo. */
  detectPitch();
};

  var getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia ?
    navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices) :
    function (constraints) {
    	return new Promise(function (resolve, reject) {
    		navigator.getUserMedia(constraints, resolve, reject);
    	});
    };

  getUserMedia({audio: true}).then(streamReceived).catch(reportError);
navigator.getUserMedia({audio: true}, streamReceived);
