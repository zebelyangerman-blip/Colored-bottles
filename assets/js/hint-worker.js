'use strict';
importScripts('spectral-core.js');
onmessage = e => {try {const {level,state,available}=e.data;postMessage(Spectral.findHint(level,state,available,90000,3000));} catch (_) {postMessage({action:null,proven:false});}};
