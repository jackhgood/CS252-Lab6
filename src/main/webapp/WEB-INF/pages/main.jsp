<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ page language="java" pageEncoding="UTF-8" session="false"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Gateway</title>

    <script type='text/javascript' src="<c:url value="/webjars/jquery/1.9.1/jquery.js" />"></script>

	<script type="text/javascript" src="/webjars/three.js/r77/three.min.js"></script>
	<script type="text/javascript" src="/js/physijs/stats.js"></script>
	<script type="text/javascript" src="/js/physijs/physi.js"></script>

    <link rel="stylesheet" href="<c:url value="/css/main.css" />" />
</head>
<body>

<h2>Main Page</h2>
<p>${message}</p>

</body>
</html>