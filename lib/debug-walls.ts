import { findRoomWallSnapPoint, findRoomContainingSegment } from "./walls"

// Test pour diagnostiquer le problème de snap des murs
export function testWallSnap() {
  // Simuler une pièce carrée simple de 4x4
  const squareRoom = {
    id: "test-room",
    name: "Test Room",
    polygon: [
      { x: 0, y: 0 },   // coin en haut à gauche  
      { x: 4, y: 0 },   // coin en haut à droite
      { x: 4, y: 4 },   // coin en bas à droite
      { x: 0, y: 4 }    // coin en bas à gauche
    ]
  }

  const testFloor = {
    id: "test-floor",
    name: "Test Floor",
    rooms: [squareRoom],
    walls: [],
    doors: [],
    verticalLinks: [],
    artworks: [],
    escalators: [],
    elevators: []
  }

  console.log("=== Test de snap pour pièce carrée 4x4 ===")
  
  // Test sur le mur du bas (de (0,4) à (4,4))
  console.log("\n--- Test mur du bas ---")
  for (let x = 0.5; x <= 3.5; x += 0.5) {
    const testPoint = { x, y: 3.8 } // Point proche du mur du bas
    const snap = findRoomWallSnapPoint(testPoint, testFloor)
    console.log(`Point (${x}, 3.8): snap =`, snap ? `(${snap.snapPoint.x}, ${snap.snapPoint.y})` : 'null')
    
    // Test si on peut créer un mur horizontal sur le bord du bas
    const wallStart = { x: x - 0.5, y: 4 }
    const wallEnd = { x: x + 0.5, y: 4 }
    const containingRoom = findRoomContainingSegment(wallStart, wallEnd, testFloor)
    console.log(`  Mur (${wallStart.x},${wallStart.y}) à (${wallEnd.x},${wallEnd.y}): dans pièce =`, containingRoom ? containingRoom.id : 'null')
  }

  // Test sur le mur de droite (de (4,0) à (4,4))  
  console.log("\n--- Test mur de droite ---")
  for (let y = 0.5; y <= 3.5; y += 0.5) {
    const testPoint = { x: 3.8, y } // Point proche du mur de droite
    const snap = findRoomWallSnapPoint(testPoint, testFloor)
    console.log(`Point (3.8, ${y}): snap =`, snap ? `(${snap.snapPoint.x}, ${snap.snapPoint.y})` : 'null')
    
    // Test si on peut créer un mur vertical sur le bord de droite  
    const wallStart = { x: 4, y: y - 0.5 }
    const wallEnd = { x: 4, y: y + 0.5 }
    const containingRoom = findRoomContainingSegment(wallStart, wallEnd, testFloor)
    console.log(`  Mur (${wallStart.x},${wallStart.y}) à (${wallEnd.x},${wallEnd.y}): dans pièce =`, containingRoom ? containingRoom.id : 'null')
  }
}