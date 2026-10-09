// Atlas movement engine: compiled to WebAssembly for the browser.
// No heap allocation or per-frame object creation. The JS bridge supplies one
// packed float buffer and the engine updates it in place.
// Standalone Wasm math approximations for the simulation hot path.
// This avoids importing six JavaScript Math functions on every native frame.
// Trigonometry is bounded to small real-time angle domains; errors are far below
// the visual precision of the movement/camera animation.
static constexpr float kPi=3.14159265358979323846f;
static constexpr float kTwoPi=6.28318530717958647692f;

static inline float fabsf(float x) { return __builtin_fabsf(x); }
static inline float sqrtf(float x) { return __builtin_sqrtf(x); }

static inline float sinf(float x) {
  const int turns=(int)(x/kTwoPi);
  x-=((float)turns)*kTwoPi;
  if(x>kPi)x-=kTwoPi;
  else if(x< -kPi)x+=kTwoPi;
  const float x2=x*x;
  return x*(1.0f+x2*(-1.0f/6.0f+x2*(1.0f/120.0f+x2*(-1.0f/5040.0f+x2*(1.0f/362880.0f+x2*(-1.0f/39916800.0f+x2*(1.0f/6227020800.0f)))))));
}
static inline float cosf(float x) { return sinf(x+kPi*.5f); }

// All current exponential inputs are in [-0.65, 0], so a degree-seven
// Taylor polynomial is accurate enough for stable damping coefficients.
static inline float expf(float x) {
  return 1.0f+x*(1.0f+x*(.5f+x*(1.0f/6.0f+x*(1.0f/24.0f+x*(1.0f/120.0f+x*(1.0f/720.0f+x*(1.0f/5040.0f))))));
}
static inline float atan_approx(float z) {
  const float magnitude=fabsf(z);
  if(magnitude>1.0f) {
    const float inverse=1.0f/magnitude;
    const float a=inverse*(kPi*.25f+.273f*(1.0f-inverse));
    return z>0.0f?kPi*.5f-a:-kPi*.5f+a;
  }
  return z*(kPi*.25f+.273f*(1.0f-magnitude));
}
static inline float atan2f(float y,float x) {
  if(x>0.0f)return atan_approx(y/x);
  if(x<0.0f)return y>=0.0f?atan_approx(y/x)+kPi:atan_approx(y/x)-kPi;
  if(y>0.0f)return kPi*.5f;
  if(y<0.0f)return -kPi*.5f;
  return 0.0f;
}

extern "C" {
__attribute__((visibility("default"))) float atlas_state[32] = {
  0.0f, -0.02f, 8.2f, 0, 0, 0, 1, 3.14159265f
};
__attribute__((visibility("default"))) int atlas_buffer() {
  return (int)(unsigned long)&atlas_state[0];
}

static constexpr int kInteractableCapacity = 128;
static constexpr int kInteractableStride = 5; // x,y,z,radius,region
static float atlas_interactables[kInteractableCapacity * kInteractableStride] = {};
static int atlas_interactable_count = 0;

__attribute__((visibility("default"))) int atlas_interactable_buffer() {
  return (int)(unsigned long)&atlas_interactables[0];
}
__attribute__((visibility("default"))) int atlas_interactable_capacity() {
  return kInteractableCapacity;
}
__attribute__((visibility("default"))) void atlas_set_interactable_count(int count) {
  atlas_interactable_count = count < 0 ? 0 : (count > kInteractableCapacity ? kInteractableCapacity : count);
}

static inline float clampf(float v, float lo, float hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}
static inline int region_at(float z) {
  if (z > -6.0f) return 0;
  if (z > -30.0f) return 1;
  if (z > -54.0f) return 2;
  if (z > -78.0f) return 3;
  if (z > -103.0f) return 4;
  return 5;
}

__attribute__((visibility("default"))) int atlas_region_at(float z) {
  return region_at(z);
}

__attribute__((visibility("default"))) int atlas_find_nearest(float x, float y, float z, int region) {
  int found = -1;
  float best = 3.402823466e+38F;
  for (int i = 0; i < atlas_interactable_count; ++i) {
    const float* item = &atlas_interactables[i * kInteractableStride];
    if ((int)item[4] != region) continue;
    const float dx=x-item[0], dy=y-item[1], dz=z-item[2];
    const float distanceSquared=dx*dx+dy*dy+dz*dz;
    const float radius=item[3];
    if (distanceSquared < radius*radius && distanceSquared < best) {
      best=distanceSquared;
      found=i;
    }
  }
  return found;
}
static inline bool blocked(float x, float z, int region) {
  struct Circle { int zone; float x, z, r; };
  // Only test obstacles belonging to the player's current chapter.
  static const Circle circles[] = {
    {0,-8,7,.78f},{0,-7,-.5f,.78f},{0,8,7,.78f},{0,7,-1,.78f},
    {0,-9,-5,.78f},{0,9,-6,.78f},{0,-5,9,.78f},{0,5,10,.78f},
    {1,5.7f,-18,.4f},
    {2,-9,-43,1.75f},{2,-6.6f,-39.8f,1.85f},{2,6.5f,-43,2.0f},
    {2,9.2f,-46,1.7f},{2,-9.1f,-50,1.6f},{2,6,-50,1.7f},{2,9.2f,-52,1.7f},
    {3,-4.8f,-66,5.05f},{3,-7,-64.6f,.65f},{3,7.3f,-65.2f,1.75f},
    {4,-8.3f,-87.5f,2.25f},{4,8.5f,-95.2f,2.35f},{4,-8.7f,-98.8f,1.9f},{4,7.6f,-91.5f,1.05f}
  };
  for (const auto &c : circles) {
    if (region != c.zone) continue;
    const float dx=x-c.x, dz=z-c.z;
    const float safeRadius=c.r+.27f;
    if (dx*dx+dz*dz < safeRadius*safeRadius) {
      const bool onDock = region==3 && z > -65.02f && z < -64.18f && x > -10.35f && x < -2.65f;
      if (!onDock) return true;
    }
  }
  if (region==1 && x > -10.25f && x < -.05f && z > -21.55f && z < -14.42f) return true;
  if (region==5) {
    // House side/rear walls and doorway opening.
    if (z < -112.45f && z > -119.8f && (x < -5.15f || x > 5.15f)) return true;
    if (z < -119.1f && x < 5.2f && x > -5.2f) return true;
    if (z < -112.15f && z > -112.85f && (x < -.93f || x > .93f)) return true;
  }
  return false;
}

// Buffer slots:
// 0..7: x,y,z,vx,vz,vertical velocity,grounded,player yaw
// 8..16: move x/y, camera yaw, delta, max speed, locked, progression z
//         gate, jump pressed, elapsed time
// 18..20: moving, jumping, horizontal speed (outputs)
__attribute__((visibility("default"))) void atlas_step(int ptr) {
  float* s = (float*)(unsigned long)ptr;
  float x=s[8], y=s[9];
  const float yaw=s[10];
  const float dt=clampf(s[11],0.0f,0.05f);
  const float maxSpeed=s[12];
  const bool locked=s[13] > 0.5f;
  const int progressMask=(int)s[14];
  const float minZ=!(progressMask&1)?-5.7f:
    !(progressMask&2)?-29.7f:
    !(progressMask&4)?-53.7f:
    !(progressMask&8)?-77.7f:
    !(progressMask&16)?-102.7f:-124.0f;
  const bool jumpPressed=s[15] > 0.5f;
  const float time=s[16];

  if (locked) { x=0; y=0; }
  const float inputLength=sqrtf(x*x+y*y);
  if(inputLength>1.0f){x/=inputLength;y/=inputLength;}
  const float sinYaw=sinf(yaw), cosYaw=cosf(yaw);
  const float targetVX=(x*cosYaw+y*sinYaw)*maxSpeed;
  const float targetVZ=(-x*sinYaw+y*cosYaw)*maxSpeed;
  const float blend=1.0f-expf(-dt*(inputLength>.035f?13.0f:10.0f));
  float vx=s[3],vz=s[4];
  if(locked){vx=0;vz=0;}
  else {vx+=(targetVX-vx)*blend;vz+=(targetVZ-vz)*blend;}

  const float oldX=s[0],oldZ=s[2];
  const float nextX=clampf(oldX+vx*dt,-10.8f,10.8f);
  if(!blocked(nextX,oldZ,region_at(oldZ))) s[0]=nextX;
  const float nextZ=clampf(oldZ+vz*dt,-124.0f,10.0f);
  const float gatedZ=nextZ<minZ?minZ:nextZ;
  if(!blocked(s[0],gatedZ,region_at(gatedZ))) s[2]=gatedZ;
  s[3]=vx; s[4]=vz;

  const float speed=sqrtf(vx*vx+vz*vz);
  const bool moving=speed>.13f&&!locked;
  const float groundY=-.02f;
  bool grounded=s[6]>.5f;
  float vy=s[5];

  // Short jump buffering + coyote time, stored in the persistent state buffer.
  // This makes jump input more forgiving without allocating timers or objects.
  float jumpBuffer=locked?0.0f:clampf(s[23],0.0f,0.12f);
  if(jumpPressed&&!locked)jumpBuffer=0.12f;
  else jumpBuffer=clampf(jumpBuffer-dt,0.0f,0.12f);
  float coyote=grounded?0.10f:clampf(s[24]-dt,0.0f,0.10f);
  if(jumpBuffer>0.0f&&!locked&&(grounded||coyote>0.0f)){
    grounded=false;
    vy=2.5f;
    jumpBuffer=0.0f;
    coyote=0.0f;
  }
  if(!grounded){
    vy-=1.62f*dt;
    s[1]+=vy*dt;
    if(s[1]<=groundY){s[1]=groundY;vy=0;grounded=true;coyote=0.10f;}
  } else {
    s[1]=groundY+(moving?fabsf(sinf(time*9.2f))*.012f:sinf(time*1.5f)*.0025f);
    coyote=0.10f;
  }
  s[5]=vy; s[6]=grounded?1.0f:0.0f;
  s[23]=jumpBuffer;
  s[24]=coyote;
  if(moving){
    const float desired=atan2f(vx,vz);
    const float turn=1.0f-expf(-dt*11.0f);
    const float difference=atan2f(sinf(desired-s[7]),cosf(desired-s[7]));
    s[7]+=difference*turn;
  }
  s[18]=moving?1.0f:0.0f;
  s[19]=grounded?0.0f:1.0f;
  s[20]=speed;
  const int currentRegion=region_at(s[2]);
  s[21]=(float)currentRegion;
  // Resolve proximity inside the same Wasm call to avoid a second JS/Wasm boundary crossing.
  s[22]=(float)atlas_find_nearest(s[0],.48f,s[2],currentRegion);
}
}
