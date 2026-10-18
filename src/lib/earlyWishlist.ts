// The heart (wishlist) buttons used to ignore taps made while the page was
// still loading its JavaScript — on a phone that's the first 1–3+ seconds
// after the page appears, so visitors had to tap 2–3 times. This tiny
// inline script runs before any of the app's JavaScript: until React is
// ready (AppContext sets window.__aqWishReady) it handles taps on any
// [data-wishlist-id] button itself — saves to localStorage (where
// AppContext then reads the wishlist from) and colours the heart via
// [data-wish-state="on"] (globals.css). It also colours hearts already in
// the wishlist as soon as the page is parsed. Once React is ready it does
// nothing and React's own handlers take over.
export const EARLY_WISHLIST_SCRIPT = `(function(){
var K='artqala_wishlist';
function read(){try{var v=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function paint(){if(window.__aqWishReady)return;var l=read(),b=document.querySelectorAll('[data-wishlist-id]');for(var i=0;i<b.length;i++){if(l.indexOf(b[i].getAttribute('data-wishlist-id'))>-1)b[i].setAttribute('data-wish-state','on');else b[i].removeAttribute('data-wish-state')}}
window.addEventListener('click',function(e){
if(window.__aqWishReady)return;
var t=e.target,b=t&&t.closest?t.closest('[data-wishlist-id]'):null;if(!b)return;
e.preventDefault();e.stopImmediatePropagation();
var id=b.getAttribute('data-wishlist-id'),l=read(),i=l.indexOf(id);
if(i>-1)l.splice(i,1);else l.push(id);
try{localStorage.setItem(K,JSON.stringify(l))}catch(x){}
paint();
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();`;
