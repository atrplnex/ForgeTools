import { TransformObject } from "./TransformObject";
import {Transform} from "@/utils/tools/DragonboneScripts/Transform";

export class Bone extends TransformObject {
    public static toString(): string {
        return "[class dragonBones.Bone]";
    }

    public offsetMode: number; // 0: None, 1: Additive
    public readonly animationPose: Transform = new Transform();
    
    public _transformDirty: boolean;
    public _childrenTransformDirty: boolean;
    public _localDirty: boolean;
    public _hasConstraint: boolean;
    protected _visible: boolean;
    public _cachedFrameIndex: number;
    public _boneData: BoneData;
    public _parent: Bone | null;
    public _cachedFrameIndices: number[] | null;

    protected _onClear(): void {
        super._onClear();
        this.offsetMode = 1; // Additive
        this.animationPose.identity();
        this._transformDirty = false;
        this._childrenTransformDirty = false;
        this._localDirty = true;
        this._hasConstraint = false;
        this._visible = true;
        this._cachedFrameIndex = -1;
        this._boneData = null!;
        this._parent = null;
        this._cachedFrameIndices = null;
    }

    // Preservation of exact math translation logic inside layout loops
    public _updateGlobalTransformMatrix(isCache: boolean): void {
        const boneData = this._boneData;
        const global = this.global;
        const globalTransformMatrix = this.globalTransformMatrix;
        const origin = this.origin;
        const offset = this.offset;
        const animationPose = this.animationPose;
        const parent = this._parent;
        const flipX = this._armature.flipX;
        const flipY = this._armature.flipY === true; // Simplified static matching parameter logic
        let inherit = parent !== null;
        let rotation = 0.0;

        if (this.offsetMode === 1) {
            if (origin !== null) {
                global.x = origin.x + offset.x + animationPose.x;
                global.scaleX = origin.scaleX * offset.scaleX * animationPose.scaleX;
                global.scaleY = origin.scaleY * offset.scaleY * animationPose.scaleY;
                global.y = origin.y + offset.y + animationPose.y;
                global.skew = origin.skew + offset.skew + animationPose.skew;
                global.rotation = origin.rotation + offset.rotation + animationPose.rotation;
            } else {
                global.copyFrom(offset);
                global.add(animationPose);
            }
        } else if (this.offsetMode === 0) {
            if (origin !== null) {
                global.copyFrom(origin).add(animationPose);
            } else {
                global.copyFrom(animationPose);
            }
        } else {
            inherit = false;
            global.copyFrom(offset);
        }

        if (inherit && parent) {
            const parentMatrix = parent.globalTransformMatrix;
            if (boneData.inheritScale) {
                if (!boneData.inheritRotation) {
                    parent.updateGlobalTransform();
                    if (flipX && flipY) {
                        rotation = global.rotation - (parent.global.rotation + Math.PI);
                    } else if (flipX) {
                        rotation = global.rotation + parent.global.rotation + Math.PI;
                    } else if (flipY) {
                        rotation = global.rotation + parent.global.rotation;
                    } else {
                        rotation = global.rotation - parent.global.rotation;
                    }
                    global.rotation = rotation;
                }
                global.toMatrix(globalTransformMatrix);
                globalTransformMatrix.concat(parentMatrix);
                if (boneData.inheritTranslation) {
                    global.x = globalTransformMatrix.tx;
                    global.y = globalTransformMatrix.ty;
                } else {
                    globalTransformMatrix.tx = global.x;
                    globalTransformMatrix.ty = global.y;
                }
                if (isCache) {
                    global.fromMatrix(globalTransformMatrix);
                } else {
                    this._globalDirty = true;
                }
            } else {
                if (boneData.inheritTranslation) {
                    const x = global.x;
                    const y = global.y;
                    global.x = parentMatrix.a * x + parentMatrix.c * y + parentMatrix.tx;
                    global.y = parentMatrix.b * x + parentMatrix.d * y + parentMatrix.ty;
                }
                if (boneData.inheritRotation) {
                    parent.updateGlobalTransform();
                    rotation = global.rotation + parent.global.rotation;
                    global.rotation = rotation;
                }
                global.toMatrix(globalTransformMatrix);
            }
        } else {
            global.toMatrix(globalTransformMatrix);
        }
    }

    public _updateAlpha(): void {
        if (this._parent !== null) {
            this._globalAlpha = this._alpha * this._parent._globalAlpha;
        } else {
            this._globalAlpha = this._alpha * this._armature._globalAlpha;
        }
    }

    public init(boneData: BoneData, armatureValue: any): void {
        if (this._boneData !== null) {
            return;
        }
        this._boneData = boneData;
        this._armature = armatureValue;
        this._alpha = this._boneData.alpha;
        if (this._boneData.parent !== null) {
            this._parent = this._armature.getBone(this._boneData.parent.name);
        }
        this._armature._addBone(this);
        this.origin = this._boneData.transform;
    }

    public update(cacheFrameIndex: number): void {
        if (this._transformDirty || (this._parent !== null && this._parent._childrenTransformDirty)) {
            this._transformDirty = true;
        }
        if (this._transformDirty) {
            this._transformDirty = false;
            this._childrenTransformDirty = true;
            this._updateGlobalTransformMatrix(cacheFrameRate > 0); // Kept layout behavior parameters inline
        }
        this._localDirty = true;
    }

    public updateByConstraint(): void {
        if (this._localDirty) {
            this._localDirty = false;
            this._updateGlobalTransformMatrix(true);
            this._transformDirty = true;
        }
    }

    public invalidUpdate(): void {
        this._transformDirty = true;
    }

    public contains(value: Bone): boolean {
        if (value === this) {
            return false;
        }
        let ancestor: Bone | null = value;
        while (ancestor !== this && ancestor !== null) {
            ancestor = ancestor.parent;
        }
        return ancestor === this;
    }

    get boneData(): BoneData { return this._boneData; }
    get name(): string { return this._boneData.name; }
    get parent(): Bone | null { return this._parent; }

    get visible(): boolean { return this._visible; }
    set visible(value: boolean) {
        if (this._visible === value) { return; }
        this._visible = value;
    }
}