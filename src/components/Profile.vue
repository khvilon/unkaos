<template>   
  <div class="profile" >
    <img :src="logo_src"><div>{{name}}</div>
  </div>
</template>

<script>
  export default 
  {
    props: 
    {
      name:
      {
        type: String,
        default: 'Хвилон Николай',
      },
      logo_src:
      {
        type: String,
        default: "https://oboz.myjetbrains.com/hub/api/rest/avatar/b9b1d87d-568f-4f54-8ee3-44035e1137ff?etag=MjYtMjYwOA%3D%3D&amp;dpr=1.25&amp;size=32",
      }
    }
  }
</script>

<style>
  .profile {
    position: absolute;
    height: 74px;
    width: 90px;
    right: 0px;
    top: 0px; 
    padding: 7px;
    
    z-index: 1001;
    display: block;
    align-items: center;
    color: white;
    width:  300px;
  }
 
  .profile img {
    height: 32px;
    width: 32px;
    object-fit: cover;
    border-radius: 6px;
    margin-right: 16px;
    float:right;
    margin-top: 16px;
    background-image: url('https://oboz.myjetbrains.com/hub/api/rest/avatar/7755ec62-dfa1-4c3c-a3a9-ac6748d607c1?dpr=1.25&size=20')
  }
  .profile div {
    margin-top: 20px;
    margin-right: 10px;
    float:right;
  }
</style>