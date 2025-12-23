<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import * as poseDetection from '@tensorflow-models/pose-detection'
import api from '../src/utils/api'

const router = useRouter()

// 3D场景相关
const containerRef = ref<HTMLDivElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let mixer: THREE.AnimationMixer
let currentAction: THREE.AnimationAction
let clock = new THREE.Clock()

// 3D模型相关
let model: THREE.Object3D
let skeleton: THREE.Skeleton
let animationClip: THREE.AnimationClip

// 关节控制相关
const joints = ref<Map<string, THREE.Bone>>()
const selectedJoint = ref<string>('')
const jointRotation = ref({ x: 0, y: 0, z: 0 })
const jointPosition = ref({ x: 0, y: 0, z: 0 })

// 状态管理
const prompt = ref('')
const isGenerating = ref(false)
const animationSpeed = ref(1.0)
const isPlaying = ref(false)
const generationError = ref('')
const generationMode = ref<'camera' | 'api'>('camera') // 生成模式：camera-摄像头捕捉，api-API生成

// TensorFlow.js相关
let detector: poseDetection.PoseDetector | null = null
let video: HTMLVideoElement | null = null
let videoRef = ref<HTMLVideoElement | null>(null)
let isCameraActive = ref(false)
let poseDetections: poseDetection.Pose[] = []

// 初始化3D场景
const initScene = () => {
  if (!containerRef.value) return

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    60,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 1.5, 3)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  containerRef.value.appendChild(renderer.domElement)

  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 1, 0)

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7.5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  const pointLight = new THREE.PointLight(0xffffff, 0.5)
  pointLight.position.set(-5, 5, -5)
  scene.add(pointLight)

  // 添加地面
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // 添加网格辅助线
  const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444)
  scene.add(gridHelper)

  // 加载默认模型
  loadDefaultModel()

  // 开始渲染循环
  animate()
}

// 加载默认模型
const loadDefaultModel = () => {
  // 这里使用一个简单的人形骨架作为默认模型
  createSimpleHumanoid()
}

// 创建简单的人形骨架
const createSimpleHumanoid = () => {
  // 创建骨架组
  const skeletonGroup = new THREE.Group()
  scene.add(skeletonGroup)

  // 创建骨骼（简化的人形骨架）
  const bones: THREE.Bone[] = []
  
  // 脊柱
  const spine1 = new THREE.Bone()
  spine1.position.y = 1.5
  bones.push(spine1)
  
  const spine2 = new THREE.Bone()
  spine2.position.y = 0.3
  spine1.add(spine2)
  bones.push(spine2)
  
  // 头部
  const head = new THREE.Bone()
  head.position.y = 0.3
  spine2.add(head)
  bones.push(head)
  
  // 左臂
  const leftUpperArm = new THREE.Bone()
  leftUpperArm.position.set(0.3, 0.1, 0)
  leftUpperArm.rotation.z = Math.PI / 6
  spine2.add(leftUpperArm)
  bones.push(leftUpperArm)
  
  const leftLowerArm = new THREE.Bone()
  leftLowerArm.position.y = -0.3
  leftUpperArm.add(leftLowerArm)
  bones.push(leftLowerArm)
  
  // 右臂
  const rightUpperArm = new THREE.Bone()
  rightUpperArm.position.set(-0.3, 0.1, 0)
  rightUpperArm.rotation.z = -Math.PI / 6
  spine2.add(rightUpperArm)
  bones.push(rightUpperArm)
  
  const rightLowerArm = new THREE.Bone()
  rightLowerArm.position.y = -0.3
  rightUpperArm.add(rightLowerArm)
  bones.push(rightLowerArm)
  
  // 左腿
  const leftUpperLeg = new THREE.Bone()
  leftUpperLeg.position.set(0.15, -0.3, 0)
  spine1.add(leftUpperLeg)
  bones.push(leftUpperLeg)
  
  const leftLowerLeg = new THREE.Bone()
  leftLowerLeg.position.y = -0.3
  leftUpperLeg.add(leftLowerLeg)
  bones.push(leftLowerLeg)
  
  // 右腿
  const rightUpperLeg = new THREE.Bone()
  rightUpperLeg.position.set(-0.15, -0.3, 0)
  spine1.add(rightUpperLeg)
  bones.push(rightUpperLeg)
  
  const rightLowerLeg = new THREE.Bone()
  rightLowerLeg.position.y = -0.3
  rightUpperLeg.add(rightLowerLeg)
  bones.push(rightLowerLeg)
  
  // 创建骨骼可视化
  skeleton = new THREE.Skeleton(bones)
  const skeletonHelper = new THREE.SkeletonHelper(spine1)
  skeletonHelper.material.linewidth = 2
  scene.add(skeletonHelper)
  
  // 创建简易的人形网格
  const geometry = new THREE.CapsuleGeometry(0.1, 0.5, 4, 8)
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true })
  
  const mesh = new THREE.Mesh(geometry, material)
  mesh.add(spine1)
  skeletonGroup.add(mesh)
  
  // 初始化关节映射
  joints.value = new Map([
    ['spine1', spine1],
    ['spine2', spine2],
    ['head', head],
    ['leftUpperArm', leftUpperArm],
    ['leftLowerArm', leftLowerArm],
    ['rightUpperArm', rightUpperArm],
    ['rightLowerArm', rightLowerArm],
    ['leftUpperLeg', leftUpperLeg],
    ['leftLowerLeg', leftLowerLeg],
    ['rightUpperLeg', rightUpperLeg],
    ['rightLowerLeg', rightLowerLeg]
  ])
  
  model = skeletonGroup
}

// 初始化TensorFlow.js姿态检测器
const initPoseDetector = async () => {
  try {
    // 加载姿态检测器
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    })
    console.log('姿态检测器加载成功')
  } catch (error) {
    console.error('加载姿态检测器失败:', error)
    generationError.value = '加载姿态检测器失败'
  }
}

// 启动摄像头
const startCamera = async () => {
  if (!detector) {
    await initPoseDetector()
  }
  
  try {
    // 获取用户媒体设备
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: 'user'
      }
    })
    
    // 使用模板中的视频元素
    video = videoRef.value
    if (!video) {
      // 如果模板中没有视频元素，创建一个
      video = document.createElement('video')
      video.width = 640
      video.height = 480
    }
    
    video.srcObject = stream
    video.autoplay = true
    video.playsInline = true
    video.muted = true // 静音，避免回声
    
    // 等待视频加载
    await video.play()
    
    isCameraActive.value = true
    console.log('摄像头启动成功')
    
    // 开始姿态检测
    detectPose()
  } catch (error) {
    console.error('启动摄像头失败:', error)
    generationError.value = '启动摄像头失败: ' + (error instanceof Error ? error.message : '未知错误')
  }
}

// 停止摄像头
const stopCamera = () => {
  if (video && video.srcObject) {
    const stream = video.srcObject as MediaStream
    const tracks = stream.getTracks()
    tracks.forEach(track => track.stop())
    video.srcObject = null
    video = null
  }
  isCameraActive.value = false
  console.log('摄像头已停止')
}

// 姿态检测
const detectPose = async () => {
  if (!detector || !video) return
  
  try {
    // 检测姿态
    poseDetections = await detector.estimatePoses(video)
    
    // 更新3D模型姿态
    updateModelPose(poseDetections[0])
    
    // 继续检测
    requestAnimationFrame(detectPose)
  } catch (error) {
    console.error('姿态检测失败:', error)
  }
}

// 根据姿态检测结果更新3D模型
const updateModelPose = (pose: poseDetection.Pose | undefined) => {
  if (!pose || !model) return
  
  // 获取姿态关键点
  const landmarks = pose.keypoints
  
  // 辅助函数：将归一化坐标转换为模型坐标
  const normalizeToModelSpace = (value: number, axis: 'x' | 'y' | 'z' = 'y') => {
    // 根据不同轴进行不同的缩放和偏移
    if (axis === 'x') {
      return (value - 0.5) * 3 // 水平方向缩放更大
    } else if (axis === 'y') {
      return (0.5 - value) * 2 // 垂直方向，反转Y轴（因为摄像头Y轴向下）
    }
    return value
  }
  
  // 辅助函数：计算两点之间的角度
  const calculateAngle = (point1: { x: number, y: number }, point2: { x: number, y: number }) => {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x)
  }
  
  // 1. 更新头部位置和旋转
  const nose = landmarks.find(lm => lm.name === 'nose')
  const leftEye = landmarks.find(lm => lm.name === 'left_eye')
  const rightEye = landmarks.find(lm => lm.name === 'right_eye')
  
  if (nose && joints.value?.get('head')) {
    const head = joints.value.get('head')!
    const headY = normalizeToModelSpace(nose.y)
    
    // 调整头部位置
    head.position.y = headY
    
    // 调整头部旋转（根据眼睛位置）
    if (leftEye && rightEye) {
      const eyeCenterX = (leftEye.x + rightEye.x) / 2
      const headRotationY = (eyeCenterX - 0.5) * Math.PI / 4 // 水平旋转限制在±45度
      head.rotation.y = headRotationY
    }
  }
  
  // 2. 更新脊柱（根据肩膀和臀部位置）
  const leftShoulder = landmarks.find(lm => lm.name === 'left_shoulder')
  const rightShoulder = landmarks.find(lm => lm.name === 'right_shoulder')
  const leftHip = landmarks.find(lm => lm.name === 'left_hip')
  const rightHip = landmarks.find(lm => lm.name === 'right_hip')
  
  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const spine1 = joints.value?.get('spine1')
    const spine2 = joints.value?.get('spine2')
    
    if (spine1 && spine2) {
      // 计算肩部中心和臀部中心
      const shoulderCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
      }
      const hipCenter = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
      }
      
      // 调整脊柱位置
      const spineY = normalizeToModelSpace(shoulderCenter.y) - 0.5
      spine1.position.y = spineY
      
      // 计算脊柱弯曲角度
      const spineAngle = calculateAngle(hipCenter, shoulderCenter)
      spine1.rotation.x = spineAngle - Math.PI / 2 // 调整到模型坐标系
    }
  }
  
  // 3. 更新左臂
  const leftElbow = landmarks.find(lm => lm.name === 'left_elbow')
  const leftWrist = landmarks.find(lm => lm.name === 'left_wrist')
  
  if (leftShoulder && leftElbow && leftWrist) {
    const leftUpperArm = joints.value?.get('leftUpperArm')
    const leftLowerArm = joints.value?.get('leftLowerArm')
    
    if (leftUpperArm && leftLowerArm) {
      // 计算上臂角度
      const upperArmAngle = calculateAngle(leftShoulder, leftElbow)
      leftUpperArm.rotation.z = upperArmAngle
      
      // 计算下臂角度
      const lowerArmAngle = calculateAngle(leftElbow, leftWrist)
      leftLowerArm.rotation.z = lowerArmAngle - upperArmAngle
    }
  }
  
  // 4. 更新右臂
  const rightElbow = landmarks.find(lm => lm.name === 'right_elbow')
  const rightWrist = landmarks.find(lm => lm.name === 'right_wrist')
  
  if (rightShoulder && rightElbow && rightWrist) {
    const rightUpperArm = joints.value?.get('rightUpperArm')
    const rightLowerArm = joints.value?.get('rightLowerArm')
    
    if (rightUpperArm && rightLowerArm) {
      // 计算上臂角度
      const upperArmAngle = calculateAngle(rightShoulder, rightElbow)
      rightUpperArm.rotation.z = upperArmAngle
      
      // 计算下臂角度
      const lowerArmAngle = calculateAngle(rightElbow, rightWrist)
      rightLowerArm.rotation.z = lowerArmAngle - upperArmAngle
    }
  }
  
  // 5. 更新左腿
  const leftKnee = landmarks.find(lm => lm.name === 'left_knee')
  const leftAnkle = landmarks.find(lm => lm.name === 'left_ankle')
  
  if (leftHip && leftKnee && leftAnkle) {
    const leftUpperLeg = joints.value?.get('leftUpperLeg')
    const leftLowerLeg = joints.value?.get('leftLowerLeg')
    
    if (leftUpperLeg && leftLowerLeg) {
      // 计算大腿角度
      const upperLegAngle = calculateAngle(leftHip, leftKnee)
      leftUpperLeg.rotation.z = upperLegAngle
      
      // 计算小腿角度
      const lowerLegAngle = calculateAngle(leftKnee, leftAnkle)
      leftLowerLeg.rotation.z = lowerLegAngle - upperLegAngle
    }
  }
  
  // 6. 更新右腿
  const rightKnee = landmarks.find(lm => lm.name === 'right_knee')
  const rightAnkle = landmarks.find(lm => lm.name === 'right_ankle')
  
  if (rightHip && rightKnee && rightAnkle) {
    const rightUpperLeg = joints.value?.get('rightUpperLeg')
    const rightLowerLeg = joints.value?.get('rightLowerLeg')
    
    if (rightUpperLeg && rightLowerLeg) {
      // 计算大腿角度
      const upperLegAngle = calculateAngle(rightHip, rightKnee)
      rightUpperLeg.rotation.z = upperLegAngle
      
      // 计算小腿角度
      const lowerLegAngle = calculateAngle(rightKnee, rightAnkle)
      rightLowerLeg.rotation.z = lowerLegAngle - upperLegAngle
    }
  }
}

// 生成3D动作
const generateAction = async () => {
  if (!prompt.value.trim()) {
    generationError.value = '请输入动作提示词'
    return
  }
  
  isGenerating.value = true
  generationError.value = ''
  
  try {
    if (generationMode.value === 'camera') {
      // 摄像头模式：启动摄像头进行实时捕捉
      if (!isCameraActive.value) {
        await startCamera()
      }
      
      // 根据提示词创建示例动画
      createSampleAnimation()
    } else {
      // API模式：调用API生成动作数据
      const actionData = await api.generate3DAction(prompt.value)
      console.log('API生成的动作数据:', actionData)
      
      // 根据API返回的动作数据创建动画
      createAnimationFromAPIData(actionData)
    }
  } catch (error) {
    // 提供更详细的错误信息
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    generationError.value = `生成动作失败: ${errorMsg}`
    console.error('生成动作失败:', error)
  } finally {
    isGenerating.value = false
  }
}

// 创建示例动画
const createSampleAnimation = () => {
  if (!model || !skeleton) return
  
  // 创建一个简单的挥手动画
  const duration = 2 // 动画持续时间（秒）
  
  // 获取右臂骨骼
  const rightUpperArm = joints.value?.get('rightUpperArm')
  const rightLowerArm = joints.value?.get('rightLowerArm')
  
  if (!rightUpperArm || !rightLowerArm) return
  
  // 记录初始姿势
  const initialUpperArmRotation = rightUpperArm.quaternion.clone()
  const initialLowerArmRotation = rightLowerArm.quaternion.clone()
  
  // 创建动画轨道
  const upperArmTrack = new THREE.QuaternionKeyframeTrack(
    'rightUpperArm.quaternion',
    [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
    [
      initialUpperArmRotation.x, initialUpperArmRotation.y, initialUpperArmRotation.z, initialUpperArmRotation.w,
      0.2, 0, 0, 0.98,
      0.4, 0, 0, 0.92,
      0.2, 0, 0, 0.98,
      initialUpperArmRotation.x, initialUpperArmRotation.y, initialUpperArmRotation.z, initialUpperArmRotation.w
    ]
  )
  
  const lowerArmTrack = new THREE.QuaternionKeyframeTrack(
    'rightLowerArm.quaternion',
    [0, duration * 0.25, duration * 0.5, duration * 0.75, duration],
    [
      initialLowerArmRotation.x, initialLowerArmRotation.y, initialLowerArmRotation.z, initialLowerArmRotation.w,
      0.3, 0, 0, 0.95,
      0.6, 0, 0, 0.8,
      0.3, 0, 0, 0.95,
      initialLowerArmRotation.x, initialLowerArmRotation.y, initialLowerArmRotation.z, initialLowerArmRotation.w
    ]
  )
  
  // 创建动画剪辑
  animationClip = new THREE.AnimationClip('wave', duration, [upperArmTrack, lowerArmTrack])
  
  // 播放动画
  playAnimation()
}

// 从API数据创建动画
const createAnimationFromAPIData = (actionData: any) => {
  if (!model || !joints.value) return
  
  const { duration, keyframes } = actionData
  const tracks: THREE.KeyframeTrack[] = []
  
  // 遍历所有关键帧，为每个关节创建动画轨道
  const jointNames = Array.from(joints.value.keys())
  
  jointNames.forEach(jointName => {
    // 获取该关节的所有关键帧数据
    const jointKeyframes = keyframes.map(keyframe => {
      const jointData = keyframe.joints.find((j: any) => j.name === jointName)
      return {
        time: keyframe.time,
        rotation: jointData?.rotation || { x: 0, y: 0, z: 0 },
        position: jointData?.position || { x: 0, y: 0, z: 0 }
      }
    })
    
    // 提取时间点
    const times = jointKeyframes.map(kf => kf.time)
    
    // 创建旋转轨道（使用四元数）
    const rotations = jointKeyframes.flatMap(kf => {
      const euler = new THREE.Euler(
        kf.rotation.x,
        kf.rotation.y,
        kf.rotation.z
      )
      const quaternion = new THREE.Quaternion().setFromEuler(euler)
      return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
    })
    
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${jointName}.quaternion`,
      times,
      rotations
    )
    tracks.push(rotationTrack)
    
    // 创建位置轨道
    const positions = jointKeyframes.flatMap(kf => [
      kf.position.x,
      kf.position.y,
      kf.position.z
    ])
    
    const positionTrack = new THREE.VectorKeyframeTrack(
      `${jointName}.position`,
      times,
      positions
    )
    tracks.push(positionTrack)
  })
  
  // 创建动画剪辑
  animationClip = new THREE.AnimationClip(actionData.name, duration, tracks)
  
  // 播放动画
  playAnimation()
}

// 播放动画
const playAnimation = () => {
  if (!model || !animationClip) return
  
  if (!mixer) {
    mixer = new THREE.AnimationMixer(model)
  }
  
  currentAction = mixer.clipAction(animationClip)
  currentAction.setLoop(THREE.LoopRepeat, Infinity)
  currentAction.setEffectiveTimeScale(animationSpeed.value)
  currentAction.play()
  isPlaying.value = true
}

// 暂停动画
const pauseAnimation = () => {
  if (currentAction) {
    currentAction.pause()
    isPlaying.value = false
  }
}

// 停止动画
const stopAnimation = () => {
  if (currentAction) {
    currentAction.stop()
    isPlaying.value = false
  }
}

// 调节动画速度
const updateAnimationSpeed = () => {
  if (currentAction) {
    currentAction.setEffectiveTimeScale(animationSpeed.value)
  }
}

// 选择关节
const selectJoint = (jointName: string) => {
  selectedJoint.value = jointName
  const joint = joints.value?.get(jointName)
  if (joint) {
    // 获取关节当前旋转（转换为欧拉角）
    const euler = new THREE.Euler().setFromQuaternion(joint.quaternion)
    jointRotation.value = {
      x: euler.x * (180 / Math.PI),
      y: euler.y * (180 / Math.PI),
      z: euler.z * (180 / Math.PI)
    }
    // 获取关节位置
    jointPosition.value = {
      x: joint.position.x,
      y: joint.position.y,
      z: joint.position.z
    }
  }
}

// 更新关节旋转
const updateJointRotation = () => {
  if (!selectedJoint.value || !joints.value) return
  
  const joint = joints.value.get(selectedJoint.value)
  if (joint) {
    // 将欧拉角转换为四元数
    const euler = new THREE.Euler(
      jointRotation.value.x * (Math.PI / 180),
      jointRotation.value.y * (Math.PI / 180),
      jointRotation.value.z * (Math.PI / 180)
    )
    joint.quaternion.setFromEuler(euler)
  }
}

// 截图功能
const takeScreenshot = () => {
  if (!renderer) return
  
  // 获取canvas元素
  const canvas = renderer.domElement
  
  // 将canvas转换为图片
  const dataURL = canvas.toDataURL('image/png')
  
  // 创建下载链接
  const link = document.createElement('a')
  link.download = `3d-action-${Date.now()}.png`
  link.href = dataURL
  link.click()
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  const delta = clock.getDelta()
  
  // 更新控制器
  controls.update()
  
  // 更新动画混合器
  if (mixer) {
    mixer.update(delta)
  }
  
  // 渲染场景
  renderer.render(scene, camera)
}

// 窗口大小调整
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return
  
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  
  renderer.setSize(width, height)
}

// 生命周期钩子
onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
  
  // 初始化姿态检测器
  initPoseDetector()
})

onUnmounted(() => {
  // 清理资源
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (controls) {
    controls.dispose()
  }
  
  if (renderer) {
    renderer.dispose()
  }
  
  window.removeEventListener('resize', handleResize)
  
  // 停止摄像头
  stopCamera()
  
  if (containerRef.value && containerRef.value.contains(renderer.domElement)) {
    containerRef.value.removeChild(renderer.domElement)
  }
})

// 返回主页
const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
    <!-- 顶部导航 -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
      <div class="container mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button 
            @click="goHome" 
            class="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="返回主页"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
          </button>
          <h1 class="text-xl font-bold">3D动作生成器 (TensorFlow.js)</h1>
        </div>
        <div class="text-sm text-slate-400">
          使用摄像头捕捉动作，实时生成3D动画
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="container mx-auto px-4 pt-24 pb-12">
      <!-- 输入区域 -->
      <div class="mb-6">
        <div class="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-300 mb-2">动作提示词</label>
            <div class="flex gap-2">
              <input
                v-model="prompt"
                placeholder="请输入动作描述，例如：'挥手问好'、'跑步'、'跳舞'"
                class="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                :disabled="isGenerating"
              />
              <button
                @click="generateAction"
                :disabled="isGenerating || !prompt.trim()"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg v-if="isGenerating" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGenerating ? '生成中...' : '生成动作' }}
              </button>
            </div>
          </div>
          
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-slate-300">生成模式：</label>
              <div class="flex gap-2">
                <button
                  @click="generationMode = 'camera'"
                  :class="[
                    'px-3 py-1 rounded-lg text-sm transition-colors',
                    generationMode === 'camera' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  ]"
                >
                  摄像头捕捉
                </button>
                <button
                  @click="generationMode = 'api'"
                  :class="[
                    'px-3 py-1 rounded-lg text-sm transition-colors',
                    generationMode === 'api' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  ]"
                >
                  API生成
                </button>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <button
              @click="isCameraActive ? stopCamera() : startCamera()"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm flex items-center gap-1"
              :disabled="generationMode === 'api'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              {{ isCameraActive ? '停止摄像头' : '启动摄像头' }}
            </button>
            
            <div v-if="generationError" class="text-red-400 text-sm">
              {{ generationError }}
            </div>
          </div>
        </div>
      </div>

      <!-- 3D场景和控制面板 -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- 3D渲染区域 -->
        <div class="lg:col-span-3 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
          <div 
            ref="containerRef" 
            class="w-full h-[500px]"
          ></div>
          
          <!-- 摄像头预览（可选） -->
          <div v-if="isCameraActive" class="p-4 bg-slate-700/50 border-t border-slate-600">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium">摄像头预览</h3>
              <button
                @click="stopCamera"
                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs"
              >
                关闭
              </button>
            </div>
            <!-- 视频预览元素 -->
            <div class="mt-2 bg-black rounded-lg p-1">
              <video 
                ref="videoRef"
                class="w-full aspect-video bg-slate-900 rounded"
                autoplay 
                playsinline 
                muted
              ></video>
            </div>
          </div>
          
          <!-- 动画控制 -->
          <div class="p-4 bg-slate-700/50 border-t border-slate-600">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <button
                  @click="isPlaying ? pauseAnimation() : playAnimation()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  {{ isPlaying ? '暂停' : '播放' }}
                </button>
                <button
                  @click="stopAnimation"
                  class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm"
                >
                  停止
                </button>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-sm text-slate-300">速度：</label>
                <input
                  v-model.number="animationSpeed"
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  @input="updateAnimationSpeed"
                  class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span class="text-sm">{{ animationSpeed.toFixed(1) }}x</span>
              </div>
              
              <button
                @click="takeScreenshot"
                class="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                截图
              </button>
            </div>
          </div>
        </div>

        <!-- 控制面板 -->
        <div class="lg:col-span-1 bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 p-4">
          <!-- 关节选择 -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3">关节选择</h3>
            <div class="space-y-2 max-h-40 overflow-y-auto pr-2">
              <button
                v-for="(joint, name) in joints?.value"
                :key="name"
                @click="selectJoint(name)"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                  selectedJoint === name ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                ]"
              >
                {{ name }}
              </button>
            </div>
          </div>

          <!-- 关节调节 -->
          <div v-if="selectedJoint" class="space-y-4">
            <h3 class="text-lg font-semibold">关节调节</h3>
            
            <!-- 旋转控制 -->
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-slate-300">旋转角度 (°)</h4>
              
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm">X轴：</label>
                  <input
                    v-model.number="jointRotation.x"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    @input="updateJointRotation"
                    class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span class="text-sm w-12 text-right">{{ jointRotation.x }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <label class="text-sm">Y轴：</label>
                  <input
                    v-model.number="jointRotation.y"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    @input="updateJointRotation"
                    class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span class="text-sm w-12 text-right">{{ jointRotation.y }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <label class="text-sm">Z轴：</label>
                  <input
                    v-model.number="jointRotation.z"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    @input="updateJointRotation"
                    class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span class="text-sm w-12 text-right">{{ jointRotation.z }}</span>
                </div>
              </div>
            </div>
            
            <!-- 位置控制 -->
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-slate-300">位置</h4>
              
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm">X：</label>
                  <input
                    v-model.number="jointPosition.x"
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span class="text-sm w-12 text-right">{{ jointPosition.x.toFixed(2) }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <label class="text-sm">Y：</label>
                  <input
                    v-model.number="jointPosition.y"
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span class="text-sm w-12 text-right">{{ jointPosition.y.toFixed(2) }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <label class="text-sm">Z：</label>
                  <input
                    v-model.number="jointPosition.z"
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    class="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span class="text-sm w-12 text-right">{{ jointPosition.z.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 无关节选中提示 -->
          <div v-else class="text-center text-slate-400 py-8">
            <p>请选择一个关节进行调节</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>