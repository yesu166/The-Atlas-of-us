# The Atlas of Us - Implementation Plan

## Prototype Comparison Summary

### GitHub Repo (The-Atlas-of-us) - PRIMARY
- C++/WASM engine for movement, collision, proximity (WORKING)
- MoonCartographer: primitive character with curved ShapeGeometry cape
- Single-file World.tsx with inline environment components
- Basic Fireflies (52 particles) + RoseDrift particles
- Working save system, puzzles, quests, cinematics
- Mobile touch controls
- Web Audio ambient system

### OpenCode Prototype (my-dear-future-wife) - ENVIRONMENT REFERENCE
- Modular architecture: CameraController, CharacterController, PerformanceManager, AudioManager
- Sophisticated CharacterController: walk cycles, breathing, head tracking, state machine
- CameraController: TPP shoulder offset, collision detection, cinematic/focus modes
- PerformanceManager: 4 quality presets, dynamic adaptation, device detection
- WeatherAtmosphere: region-specific particles (mist, dust, snow, rain, particles)
- Fireflies: base position tracking, additive blending, 30 particles per region
- RegionEnvironment: per-region lighting/fog/point light configs
- InstancedMesh for vegetation (trees, flowers)
- AudioManager: region ambience, music progression, surface-specific footsteps

## Phase Implementation

### Phase A: Baseline & Synchronization ✓
- [x] Clone repo, verify git status
- [x] Install dependencies, verify build
- [x] Locate and analyze both prototypes
- [x] Create this implementation plan

### Phase B: Character, Cape & Controls (Priority 1)
- [ ] Verify MoonCartographer cape attachment in motion (idle, walk, jump, turn)
- [ ] Fix any cape detachment/clipping issues
- [ ] Ensure camera-relative movement works correctly
- [ ] Test mobile joystick and desktop keyboard
- [ ] Verify collision and progression gates work

### Phase C: Environment Integration (Priority 2)
- [ ] Port WeatherAtmosphere with region-specific particle types
- [ ] Enhance Fireflies with base positions, additive blending, regional variation
- [ ] Add RegionEnvironment lighting/fog configs per region
- [ ] Convert vegetation to InstancedMesh (trees, flowers)
- [ ] Add butterfly system (new - low-poly, instanced)
- [ ] Improve RoseDrift/LoveTrail with quality scaling

### Phase D: Advanced Gameplay & Camera (Priority 3)
- [ ] Port CameraController with TPP shoulder offset
- [ ] Add camera collision detection
- [ ] Add cinematic/focus mode support
- [ ] Add surface-specific footstep audio
- [ ] Improve interaction proximity detection

### Phase E: C++/WASM Engine Strengthening (Priority 4)
- [ ] Verify WASM engine loads and runs (not silently falling back)
- [ ] Audit JS/WASM boundary for per-frame allocations
- [ ] Implement in-place stepInPlace() API if beneficial
- [ ] Validate collision, gate, region, proximity behavior
- [ ] Ensure fallback works if WASM fails

### Phase F: Performance Optimization (Priority 5)
- [ ] Integrate PerformanceManager with quality presets
- [ ] Apply quality settings to DPR, particles, shadows, vegetation
- [ ] Reduce draw calls via instancing
- [ ] Profile and optimize frame time
- [ ] Test mobile performance

### Phase G: QA & Final Validation (Priority 6)
- [ ] Full playthrough: intro → all 6 regions → ending
- [ ] Verify cape from all angles during all animations
- [ ] Test desktop (mouse orbit) and mobile (touch) controls
- [ ] Verify all puzzles, quests, letters, fragments
- [ ] Test save/load persistence
- [ ] Test WASM fallback
- [ ] Capture screenshots (1440x900 desktop, 390x844 mobile)
- [ ] Build production, run tests
- [ ] Push feature branch

## Files to Modify/Create

### Core Game Files (The-Atlas-of-us)
- `src/three/MoonCartographer.tsx` - Fix cape, verify animation
- `src/three/World.tsx` - Integrate new environment systems
- `src/three/Systems.tsx` - Enhance Fireflies, add WeatherAtmosphere
- `src/three/engine.ts` - Optimize WASM bridge
- `src/three/atlas_engine.cpp` - Verify/optimize native code
- `src/components/TouchControls.tsx` - Verify mobile controls
- `src/lib/sound.ts` - Add footstep sounds per surface
- `src/App.tsx` - Integrate camera controller, quality settings

### New Files (ported from my-dear-future-wife)
- `src/game/systems/CameraController.ts` - TPP camera with collision
- `src/game/systems/CharacterController.ts` - Advanced character animation
- `src/game/systems/PerformanceManager.ts` - Quality management
- `src/lib/audio/AudioManager.ts` - Enhanced audio with footsteps
- `src/three/effects/WeatherAtmosphere.tsx` - Region particles
- `src/three/environments/RegionEnvironment.tsx` - Regional lighting
- `src/three/objects/Butterflies.tsx` - NEW: Butterfly system

## Key Integration Points

1. **CameraController** replaces manual camera logic in World.tsx Player component
2. **CharacterController** can enhance or replace MoonCartographer animation
3. **PerformanceManager** controls DPR, particle counts, vegetation density
3. **WeatherAtmosphere** replaces/adds to Atmosphere in Systems.tsx
4. **RegionEnvironment** replaces inline region geometry in World.tsx
5. **AudioManager** replaces sound.ts with richer system

## Risk Mitigation

- Keep MoonCartographer as primary character; CharacterController as enhancement
- WASM engine must remain functional; test after every change
- Preserve all existing gameplay: quests, puzzles, save state, progression
- Second prototype stays intact in separate directory until integration verified
- Use feature branch for all changes; no force-push

## Success Criteria

- Character cape stays attached in all animations
- Environment feels alive with fireflies, weather, butterflies
- Camera feels responsive with TPP shoulder offset
- 60fps desktop, 30+fps mobile
- All existing gameplay works
- WASM engine used on supported browsers
- Production build passes