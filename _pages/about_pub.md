---
permalink: /
title: "About me"
excerpt: "About me"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

Hi! I am a first year PhD student at [Imperial College London](https://www.imperial.ac.uk/), advised by [Tolga Birda](https://tolgabirdal.github.io/) and [Gerard Pons-Moll](https://virtualhumans.mpi-inf.mpg.de/). Previously, I received my Bachelor's degree in Computer Science & Mathematics from the Hong Kong University of Science and Technology (HKUST).  


My research interest lies in 3D Computer Vision and Graphics, with a specific interest in leveraging machine learning techniques to comprehend dynamic information in the physical world. My research goal is to enable machine to understand the dynamic world around us.


Feel free to reach out for potential collaborations or discussions!

Education
======
* PhD in Computing, Imperial College London (Ongoing)
* BSc in Computer Science & Mathematics, Hong Kong University of Science and Technology, 2025 
* Exchange (Computer Science), National University of Singapore, 2024 Spring 
* Summer Research intern(Computer Science), Stanford University

Publication
====   
(*: equal contribution, †: equal advising)

<style>
.pub{
margin: 10px auto;
overflow: hidden; /* 避免長方框下面顯示不正常 */
}
.bdcard{
/* width: 250px; */
float:left;
padding: 0px 0px 0px 0px;
}
.bdcard img{
display: block;
width:100%;
max-width: 378px;
margin-left: 0px;
margin-top: 30px;
margin-right: 5px;
}
.bdtext{
float: left;
width: 100%px;
max-width: 384px;
padding: 0px 0px 0px 0px;
margin-left: 0px;
}
</style>



<body class='typora-export os-windows'>
<div class="pub">
<div class="bdcard">
<img src="../assets/images/dragvideo.gif" alt="dragvideo" />
</div>
<div class="bdtext">
<h3>[ECCV 2024] DragVideo: Interactive Drag-style Video Editing</h3>
<font size="3" >
<a href="https://yufandeng.com/">Yufan Deng</a>*,
<a href="https://github.com/RickySkywalker">Ruida Wang</a>*,
<b>Yuhao Zhang</b>*, 
<a href="https://yuwingtai.github.io/">Yu-Wing Tai</a>†, 
<a href="http://www.cs.ust.hk/~cktang/">Chi-Keung Tang</a>† <br>
<!-- <i> arXiv preprint, 2023 </i> <br> -->
<a href="https://dragvideo.github.io">[Page]</a> <a href="https://arxiv.org/abs/2312.02216">[Paper]</a> <a href="https://github.com/RickySkywalker/DragVideo-Official">[Code]</a><br>
<b>Selected to Hugging Face daily paper</b><br>
</font>
</div>
</div>
</body>

<body class='typora-export os-windows'>
<div class="pub">
<div class="bdcard">
<img src="../assets/images/anymate.gif" alt="anymate" />
</div>
<div class="bdtext">
<h3>[SIGGRAPH 2025]Anymate: A Dataset and Baselines for
Learning 3D Object Rigging</h3>
<font size="3" >
<b><i>Yuhao Zhang</i></b>*, 
<a href="https://yufandeng.com/"><i>Yufan Deng</i></a>*, 
<a href="https://chen-geng.com/"><i>Chen Geng</i></a>, 
<a href="https://elliottwu.com/"><i>Shangzhe Wu</i></a>†, 
<a href="https://jiajunwu.com/"><i>Jiajun Wu</i></a>† <br>
<a href="https://anymate3d.github.io/">[Page]</a> <a href="https://arxiv.org/abs/2505.06227">[Paper]</a> <a href="https://github.com/yfde/Anymate">[Code]</a> <a href="https://huggingface.co/spaces/yfdeng/Anymate">[Demo]</a><br>
</font>
</div>
</div>
</body>

<!-- Note
======
- [**Understanding the Theory Behind Transformers: An Overview of current research**](../assets/files/comp5212.pdf)
<br /> PG level Machine Learning Course Project
<br /> A brief summary of some current research on understanding Transformer -->

## Academic Activities
* Heidelberg Laureate Forum, Heidelberg, Germany, Sep 2024 
* European Conference on Computer Vision (ECCV), Milano, October 2024
  
<body>
    <!-- 可折叠的地图部分 -->
    <div style="width: 100%; max-width: 800px; margin: auto; text-align: center;">
        <button onclick="toggleMap()" style="background: none; border: none; color: #666; cursor: pointer; margin-bottom: 1rem; font-size: 0.9rem;">
            Show Visitors Map
        </button>
        <div id="mapContainer" style="display: none; width: 100%; max-width: 800px; margin: auto; position: relative;">
        <script type="text/javascript" id="clustrmaps" src="//cdn.clustrmaps.com/map_v2.js?cl=ffffff&w=200&t=n&d=rUF992iYQWrZ_LL1QubVCDfh8_5rwRTDGQH_ZDxDV4A"></script>
        </div>
    </div>
    <script src="script.js"></script>
    <!-- 添加内联脚本 -->
    <script>
        function toggleMap() {
            const container = document.getElementById('mapContainer');
            const isHidden = container.style.display === 'none';
            container.style.display = isHidden ? 'block' : 'none';
        }
    </script>
</body>