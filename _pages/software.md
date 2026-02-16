/* ==========================================================================
   Software page polish (tuned)
   ========================================================================== */

.software-card{
  display: flow-root; /* contains floated images nicely */
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 14px;
  padding: 1rem 1.05rem;
  margin: 1.05rem 0 1.4rem;
  background: rgba(255,255,255,.98);

  /* lighter shadow */
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}

.software-card h2, .software-card h3{
  margin: .15rem 0 .25rem 0;
  font-size: 1.12rem;
  line-height: 1.2;
}

.software-card p{
  margin: .4rem 0;
  line-height: 1.45;
}

.software-meta{
  font-size: .95rem;
  color: rgba(0,0,0,.68);
  margin-bottom: .6rem;
}
.software-meta small{
  font-size: .92em;
  line-height: 1.4;
  display: block;
}

hr.soft-sep{
  border: 0;
  border-top: 1px solid rgba(0,0,0,.12);
  margin: .85rem 0 .7rem;
}

/* Pills */
.software-actions{
  margin-top: .45rem;
  display: flex;
  flex-wrap: wrap;
  gap: .4rem .55rem;
}

.software-actions a{
  display: inline-flex;
  align-items: center;
  padding: .2rem .65rem;
  border-radius: 999px;

  /* make pills obvious */
  border: 1px solid rgba(0,0,0,.18);
  background: rgba(0,0,0,.03);

  text-decoration: none;
  border-bottom: 0; /* prevent any theme underline/border styles */
  font-size: .93rem;
  line-height: 1.2;
  white-space: nowrap;
}

.software-actions a:hover{
  border-color: rgba(0,0,0,.26);
  background: rgba(0,0,0,.05);
}

/* Images */
.software-logo{
  float: right;
  margin-left: 1rem;
  margin-bottom: .25rem;
  height: 110px;
  max-width: 35%;
}
@media (max-width: 640px){
  .software-logo{ float: none; display: block; margin: 0 auto .75rem; height: 95px; }
}

.software-figure{
  float: right;
  width: 22%;
  max-width: 260px;
  margin: .45rem 0 .6rem 1.2rem;
  border-radius: 8px;

  /* toned down */
  box-shadow: 0 2px 8px rgba(0,0,0,.10);
}
@media (max-width: 640px){
  .software-figure{
    float: none;
    display: block;
    margin: .9rem auto;
    width: 78%;
    max-width: 340px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark){
  .software-card{
    border-color: rgba(255,255,255,.14);
    background: rgba(255,255,255,.04);
    box-shadow: 0 8px 20px rgba(0,0,0,.28);
  }
  .software-meta{ color: rgba(255,255,255,.70); }
  .software-actions a{
    border-color: rgba(255,255,255,.18);
    background: rgba(255,255,255,.06);
  }
  hr.soft-sep{ border-top-color: rgba(255,255,255,.14); }
}