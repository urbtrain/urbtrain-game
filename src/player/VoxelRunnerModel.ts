import { Color3, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";

export type SkinId = "urban" | "cyberpunk" | "golden" | "ninja";

export interface SkinDefinition {
    id: SkinId;
    name: string;
    description: string;
    jacketColor: string;
    pantsColor: string;
    shoesColor: string;
    skinColor: string;
    accessoryColor: string;
    emissiveColor: string;
}

export const SKINS: Record<SkinId, SkinDefinition> = {
    urban: {
        id: "urban",
        name: "URBTRAIN Runner",
        description: "Estilo urbano clássico com fones neon",
        jacketColor: "#f07b27",
        pantsColor: "#1c2730",
        shoesColor: "#ffffff",
        skinColor: "#f2b388",
        accessoryColor: "#00d2ff",
        emissiveColor: "#00d2ff"
    },
    cyberpunk: {
        id: "cyberpunk",
        name: "Cyberpunk LED",
        description: "Traje futurista com visor neon cyan",
        jacketColor: "#1a1a2e",
        pantsColor: "#0f0f18",
        shoesColor: "#ff007f",
        skinColor: "#e0c0a8",
        accessoryColor: "#00ffff",
        emissiveColor: "#00ffff"
    },
    golden: {
        id: "golden",
        name: "Golden Legend",
        description: "Armadura reluzente com aura dourada",
        jacketColor: "#ffd700",
        pantsColor: "#b8860b",
        shoesColor: "#ffffff",
        skinColor: "#f5c6a5",
        accessoryColor: "#ffffff",
        emissiveColor: "#ffd700"
    },
    ninja: {
        id: "ninja",
        name: "Shadow Ninja",
        description: "Traje sigiloso com visor rubi emissivo",
        jacketColor: "#8b0000",
        pantsColor: "#111111",
        shoesColor: "#222222",
        skinColor: "#705040",
        accessoryColor: "#ff1a1a",
        emissiveColor: "#ff0000"
    }
};

export class VoxelRunnerModel {
    public readonly root = new TransformNode("voxel-runner-root");

    // Limb TransformNodes for articulation
    private readonly torso: TransformNode;
    private readonly head: TransformNode;
    private readonly leftArm: TransformNode;
    private readonly rightArm: TransformNode;
    private readonly leftLeg: TransformNode;
    private readonly rightLeg: TransformNode;

    // Materials
    private readonly jacketMat: StandardMaterial;
    private readonly pantsMat: StandardMaterial;
    private readonly shoesMat: StandardMaterial;
    private readonly skinMat: StandardMaterial;
    private readonly accessoryMat: StandardMaterial;
    private readonly emissiveMat: StandardMaterial;

    private currentSkin: SkinId = "urban";
    private animTime = 0;

    public constructor(scene: Scene) {
        // Instantiate Materials
        this.jacketMat = new StandardMaterial("mat-jacket", scene);
        this.pantsMat = new StandardMaterial("mat-pants", scene);
        this.shoesMat = new StandardMaterial("mat-shoes", scene);
        this.skinMat = new StandardMaterial("mat-skin", scene);
        this.accessoryMat = new StandardMaterial("mat-acc", scene);
        this.emissiveMat = new StandardMaterial("mat-emissive", scene);

        // Torso (Center Node)
        this.torso = new TransformNode("torso", scene);
        this.torso.parent = this.root;
        this.torso.position.y = 1.4;

        const torsoMesh = MeshBuilder.CreateBox("torso-mesh", { width: 0.9, height: 1.1, depth: 0.5 }, scene);
        torsoMesh.parent = this.torso;
        torsoMesh.position.y = 0.55;
        torsoMesh.material = this.jacketMat;

        // Head
        this.head = new TransformNode("head", scene);
        this.head.parent = this.torso;
        this.head.position.y = 1.15;

        const headMesh = MeshBuilder.CreateBox("head-mesh", { width: 0.65, height: 0.65, depth: 0.65 }, scene);
        headMesh.parent = this.head;
        headMesh.position.y = 0.32;
        headMesh.material = this.skinMat;

        // Headphones / Visor Accessory
        const accessoryMesh = MeshBuilder.CreateBox("acc-mesh", { width: 0.72, height: 0.22, depth: 0.68 }, scene);
        accessoryMesh.parent = this.head;
        accessoryMesh.position = new Vector3(0, 0.38, 0.05);
        accessoryMesh.material = this.emissiveMat;

        // Backpack
        const packMesh = MeshBuilder.CreateBox("pack-mesh", { width: 0.65, height: 0.8, depth: 0.3 }, scene);
        packMesh.parent = this.torso;
        packMesh.position = new Vector3(0, 0.55, -0.38);
        packMesh.material = this.accessoryMat;

        // Left Arm
        this.leftArm = new TransformNode("leftArm", scene);
        this.leftArm.parent = this.torso;
        this.leftArm.position = new Vector3(-0.6, 1.0, 0);

        const leftArmMesh = MeshBuilder.CreateBox("leftArm-mesh", { width: 0.28, height: 0.95, depth: 0.28 }, scene);
        leftArmMesh.parent = this.leftArm;
        leftArmMesh.position.y = -0.42;
        leftArmMesh.material = this.jacketMat;

        // Right Arm
        this.rightArm = new TransformNode("rightArm", scene);
        this.rightArm.parent = this.torso;
        this.rightArm.position = new Vector3(0.6, 1.0, 0);

        const rightArmMesh = MeshBuilder.CreateBox("rightArm-mesh", { width: 0.28, height: 0.95, depth: 0.28 }, scene);
        rightArmMesh.parent = this.rightArm;
        rightArmMesh.position.y = -0.42;
        rightArmMesh.material = this.jacketMat;

        // Left Leg
        this.leftLeg = new TransformNode("leftLeg", scene);
        this.leftLeg.parent = this.torso;
        this.leftLeg.position = new Vector3(-0.25, 0, 0);

        const leftLegMesh = MeshBuilder.CreateBox("leftLeg-mesh", { width: 0.32, height: 0.85, depth: 0.32 }, scene);
        leftLegMesh.parent = this.leftLeg;
        leftLegMesh.position.y = -0.42;
        leftLegMesh.material = this.pantsMat;

        const leftShoeMesh = MeshBuilder.CreateBox("leftShoe-mesh", { width: 0.36, height: 0.28, depth: 0.5 }, scene);
        leftShoeMesh.parent = this.leftLeg;
        leftShoeMesh.position = new Vector3(0, -0.72, 0.08);
        leftShoeMesh.material = this.shoesMat;

        // Right Leg
        this.rightLeg = new TransformNode("rightLeg", scene);
        this.rightLeg.parent = this.torso;
        this.rightLeg.position = new Vector3(0.25, 0, 0);

        const rightLegMesh = MeshBuilder.CreateBox("rightLeg-mesh", { width: 0.32, height: 0.85, depth: 0.32 }, scene);
        rightLegMesh.parent = this.rightLeg;
        rightLegMesh.position.y = -0.42;
        rightLegMesh.material = this.pantsMat;

        const rightShoeMesh = MeshBuilder.CreateBox("rightShoe-mesh", { width: 0.36, height: 0.28, depth: 0.5 }, scene);
        rightShoeMesh.parent = this.rightLeg;
        rightShoeMesh.position = new Vector3(0, -0.72, 0.08);
        rightShoeMesh.material = this.shoesMat;

        this.applySkin("urban");
    }

    public applySkin(skinId: SkinId): void {
        const skin = SKINS[skinId] ?? SKINS.urban;
        this.currentSkin = skin.id;

        this.jacketMat.diffuseColor = Color3.FromHexString(skin.jacketColor);
        this.pantsMat.diffuseColor = Color3.FromHexString(skin.pantsColor);
        this.shoesMat.diffuseColor = Color3.FromHexString(skin.shoesColor);
        this.skinMat.diffuseColor = Color3.FromHexString(skin.skinColor);
        this.accessoryMat.diffuseColor = Color3.FromHexString(skin.accessoryColor);

        this.emissiveMat.diffuseColor = Color3.FromHexString(skin.emissiveColor);
        this.emissiveMat.emissiveColor = Color3.FromHexString(skin.emissiveColor).scale(0.85);

        // Specular settings
        this.jacketMat.specularColor = Color3.Black();
        this.pantsMat.specularColor = Color3.Black();
        this.shoesMat.specularColor = Color3.White().scale(0.3);
    }

    public getSkin(): SkinId {
        return this.currentSkin;
    }

    public updateAnimation(dt: number, state: string, verticalVelocity: number, slideTime: number): void {
        this.animTime += dt;

        if (state === "hit") {
            // Crash / Fallback animation
            this.torso.rotation.x = -0.65;
            this.torso.rotation.z = 0.35;
            this.torso.position.y = 0.5;
            this.leftArm.rotation.x = -1.4;
            this.rightArm.rotation.x = -1.2;
            this.leftLeg.rotation.x = 0.6;
            this.rightLeg.rotation.x = -0.4;
            return;
        }

        if (slideTime > 0) {
            // Sliding low under obstacles
            this.torso.rotation.x = -0.75;
            this.torso.rotation.z = 0;
            this.torso.position.y = 0.72;
            this.head.rotation.x = 0.45;

            this.leftArm.rotation.x = -1.1;
            this.rightArm.rotation.x = -1.1;
            this.leftLeg.rotation.x = -1.1;
            this.rightLeg.rotation.x = -1.3;
            return;
        }

        if (verticalVelocity !== 0) {
            // Jumping / Airtime animation
            this.torso.rotation.x = 0.12;
            this.torso.rotation.z = 0;
            this.torso.position.y = 1.4;
            this.head.rotation.x = 0;

            // Legs bent up
            this.leftLeg.rotation.x = 0.85;
            this.rightLeg.rotation.x = 0.45;
            // Arms raised for balance
            this.leftArm.rotation.x = -1.3;
            this.rightArm.rotation.x = -1.1;
            return;
        }

        // Ground Running Cycle
        const runSpeed = 17;
        const legAngle = Math.sin(this.animTime * runSpeed) * 0.78;
        const armAngle = Math.sin(this.animTime * runSpeed) * 0.72;
        const bob = Math.abs(Math.sin(this.animTime * runSpeed)) * 0.11;

        this.torso.rotation.x = 0.12; // Slight forward tilt
        this.torso.rotation.z = 0;
        this.torso.position.y = 1.38 + bob;
        this.head.rotation.x = -0.05;

        this.leftLeg.rotation.x = legAngle;
        this.rightLeg.rotation.x = -legAngle;
        this.leftArm.rotation.x = -armAngle;
        this.rightArm.rotation.x = armAngle;
    }
}
